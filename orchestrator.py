"""Flow orchestrator utilities: parse YAML/JSON flows and orchestrate with RQ + MQTT."""

from __future__ import annotations

import json
import logging
import os
import threading
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

# ----- Optional AudioAgent validation -----
try:  # לא חובה בזמן ריצה
    from audio_agent_library import AudioAgent  # type: ignore
except Exception:  # pragma: no cover
    AudioAgent = None  # type: ignore

# ----- Third-party runtime deps -----
import yaml  # type: ignore
from redis import Redis  # type: ignore
from rq import Queue, Worker, Retry  # type: ignore
import paho.mqtt.client as mqtt  # type: ignore

logger = logging.getLogger(__name__)
MQTT_TOPIC = "audio/edit"


# ----------------------------- Flow parsing ----------------------------- #
def parse_flow(
    file_path: str,
    *,
    supported_ops: Optional[set[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Parse a flow definition file (YAML/JSON) into ordered 'actions'.

    Each action dict has:
      - name: str
      - operation: str
      - parameters: dict
      - mqtt: {topic, payload}
      - queue_task: payload (for internal queues)

    Raises:
        FileNotFoundError: if file not found
        ValueError: unsupported format or unknown step type
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Flow file not found: {file_path}")

    suffix = path.suffix.lower()
    if suffix in {".yaml", ".yml"}:
        data = yaml.safe_load(path.read_text())
    elif suffix == ".json":
        data = json.loads(path.read_text())
    else:
        raise ValueError("Unsupported flow format. Use YAML or JSON.")

    steps = data.get("steps", [])
    workflow_name = data.get("workflow_name", Path(file_path).stem)

    # Discover supported operations from AudioAgent if available
    if supported_ops is None:
        if AudioAgent is not None:
            try:
                agent = AudioAgent()
                supported_ops = set(getattr(agent, "supported_operations", {}) or {})
            except Exception:  # graceful degrade
                supported_ops = None
        else:
            supported_ops = None

    actions: List[Dict[str, Any]] = []

    for idx, step in enumerate(steps, 1):
        step_type = step.get("type")
        if not isinstance(step_type, str):
            raise ValueError(f"Step #{idx} missing 'type' string")
        if supported_ops and step_type not in supported_ops:
            raise ValueError(f"Unsupported step type: {step_type}")

        request_id = f"{workflow_name}_{idx}_{uuid.uuid4().hex[:8]}"
        parameters = step.get("parameters", {}) or {}

        payload = {
            "request_id": request_id,
            "operation": step_type,
            "parameters": parameters,
        }

        actions.append(
            {
                "name": step.get("name", f"step_{idx}"),
                "operation": step_type,
                "parameters": parameters,
                "mqtt": {"topic": MQTT_TOPIC, "payload": payload},
                "queue_task": payload,
                # מאפשר לציין פר־צעד ttl/retries בקובץ ה-flow (לא חובה)
                "ttl": step.get("ttl"),
                "retries": step.get("retries"),
            }
        )

    return actions


# ----------------------------- Orchestrator ----------------------------- #
class WorkflowOrchestrator:
    """Orchestrates audio workflows using Redis/RQ and MQTT."""

    def __init__(
        self,
        *,
        redis_url: str | None = None,
        mqtt_broker: str | None = None,
        mqtt_port: int | None = None,
        auto_start_worker: bool = False,
    ) -> None:
        redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        mqtt_broker = mqtt_broker or os.getenv("MCP_MQTT_BROKER", "localhost")
        mqtt_port = int(mqtt_port or os.getenv("MCP_MQTT_PORT", 1883))

        self.redis = Redis.from_url(redis_url)
        self.queue = Queue("audio_workflows", connection=self.redis)

        self.mqtt_client = mqtt.Client()
        try:
            self.mqtt_client.connect(mqtt_broker, mqtt_port)
            self.mqtt_client.loop_start()
        except Exception as exc:  # pragma: no cover
            logger.warning("MQTT connection failed: %s", exc)

        # Workflows in memory: name -> list[step]
        # כל צעד לפחות: {'operation': str, 'parameters': dict, 'ttl': int?, 'retries': int?}
        self.workflows: dict[str, List[Dict[str, Any]]] = {
            "basic": [
                {"operation": "trim", "parameters": {}, "ttl": 300, "retries": 1},
                {"operation": "normalize", "parameters": {}, "ttl": 300, "retries": 1},
            ]
        }

        if auto_start_worker:
            self.start_worker()

    # ---- Workflow management ----
    def load_workflow_from_file(self, name: str, file_path: str) -> None:
        """Load a YAML/JSON flow and store it under `name`."""
        actions = parse_flow(file_path)
        # Normalize actions into simple steps list the enqueue method expects
        steps: List[Dict[str, Any]] = []
        for a in actions:
            steps.append(
                {
                    "operation": a["operation"],
                    "parameters": a.get("parameters", {}) or {},
                    "ttl": a.get("ttl", 3600),
                    "retries": a.get("retries", 0),
                }
            )
        self.workflows[name] = steps

    # ---- Enqueue APIs ----
    def enqueue_from_file(self, file_path: str, audio_path: str, client_id: str) -> dict:
        """Load a flow file and enqueue it immediately."""
        temp_name = f"flow_{uuid.uuid4().hex[:6]}"
        self.load_workflow_from_file(temp_name, file_path)
        return self.enqueue_workflow(temp_name, audio_path, client_id)

    def enqueue_workflow(self, workflow_name: str, audio_path: str, client_id: str) -> dict:
        """
        Enqueue each step of a named workflow.

        Each step becomes an RQ job that publishes to MQTT topic 'audio/edit'
        and emits a status on 'audio/status/<step_id>'.
        """
        steps = self.workflows.get(workflow_name)
        if not steps:
            raise ValueError(f"Unknown workflow: {workflow_name}")

        workflow_id = str(uuid.uuid4())
        step_ids: list[str] = []

        for step in steps:
            step_id = str(uuid.uuid4())
            payload = {
                "id": step_id,
                "workflow_id": workflow_id,
                "client_id": client_id,
                "audio_data": audio_path,  # יכול להיות path/URL/ID
                "operation": step["operation"],
                "parameters": step.get("parameters", {}) or {},
                "callback": f"audio/status/{step_id}",
            }
            self.queue.enqueue(
                self._dispatch_step,
                payload,
                job_id=step_id,
                ttl=int(step.get("ttl", 3600)),
                retry=Retry(max=int(step.get("retries", 0))),
            )
            step_ids.append(step_id)

        return {"workflow_id": workflow_id, "steps": step_ids}

    # ---- Worker job ----
    def _dispatch_step(self, payload: dict) -> None:
        """Worker job that publishes a workflow step to MQTT."""
        step_id = payload["id"]
        status_key = f"status:{step_id}"

        try:
            self.redis.set(status_key, "dispatched")
        except Exception as exc:  # pragma: no cover
            logger.warning("Redis set failed: %s", exc)

        try:
            # Publish the job to the processing topic
            self.mqtt_client.publish(MQTT_TOPIC, json.dumps(payload))
            # Emit a status heartbeat on the callback topic
            self.mqtt_client.publish(payload["callback"], json.dumps({"status": "dispatched"}))
        except Exception as exc:  # pragma: no cover
            logger.warning("MQTT publish failed: %s", exc)

    # ---- Worker loop ----
    def start_worker(self) -> None:
        """Start an RQ worker in a background thread."""
        def _run() -> None:
            try:
                worker = Worker([self.queue], connection=self.redis)
                worker.work(with_scheduler=True)
            except Exception as exc:  # pragma: no cover
                logger.warning("Worker terminated: %s", exc)

        thread = threading.Thread(target=_run, daemon=True)
        thread.start()
