import json
import logging
import os
import threading
import uuid

from redis import Redis
from rq import Queue, Worker, Retry
import paho.mqtt.client as mqtt


logger = logging.getLogger(__name__)


class WorkflowOrchestrator:
    """Orchestrates audio workflows using RQ and MQTT."""

    def __init__(
        self,
        redis_url: str | None = None,
        mqtt_broker: str | None = None,
        mqtt_port: int | None = None,
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
        except Exception as exc:  # pragma: no cover - best effort connection
            logger.warning("MQTT connection failed: %s", exc)

        # Example workflow definitions. Real deployments might load these from DB/YAML.
        self.workflows = {
            "basic": [
                {"operation": "trim", "ttl": 300, "retries": 1},
                {"operation": "normalize", "ttl": 300, "retries": 1},
            ]
        }

        self.start_worker()

    # ------------------------------------------------------------------
    def enqueue_workflow(self, workflow_name: str, audio_path: str, client_id: str) -> dict:
        """Parse workflow and enqueue each step for processing.

        Each step is pushed to the RQ queue where a worker will publish it
        to the MQTT ``audio/edit`` topic and emit status updates.
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
                "audio_data": audio_path,
                "operation": step["operation"],
                "callback": f"audio/status/{step_id}",
            }
            self.queue.enqueue(
                self._dispatch_step,
                payload,
                job_id=step_id,
                ttl=step.get("ttl", 3600),
                retry=Retry(max=step.get("retries", 0)),
            )
            step_ids.append(step_id)

        return {"workflow_id": workflow_id, "steps": step_ids}

    # ------------------------------------------------------------------
    def _dispatch_step(self, payload: dict) -> None:
        """Worker job that publishes a workflow step to MQTT."""
        step_id = payload["id"]
        status_key = f"status:{step_id}"

        # Mark dispatched in Redis and MQTT
        try:
            self.redis.set(status_key, "dispatched")
        except Exception as exc:  # pragma: no cover - redis optional in tests
            logger.warning("Redis set failed: %s", exc)

        try:
            self.mqtt_client.publish("audio/edit", json.dumps(payload))
            self.mqtt_client.publish(
                payload["callback"], json.dumps({"status": "dispatched"})
            )
        except Exception as exc:  # pragma: no cover
            logger.warning("MQTT publish failed: %s", exc)

    # ------------------------------------------------------------------
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
