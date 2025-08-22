"""Flow orchestrator utilities."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List
import uuid

import yaml

from audio_agent_library import AudioAgent

MQTT_TOPIC = "audio/edit"


def parse_flow(file_path: str) -> List[Dict[str, Any]]:
    """Parse a flow definition file.

    Supports YAML and JSON. Validates that each step's ``type`` is a
    supported audio operation and builds an ordered list of actions. Each
    action contains information for MQTT publishing and for queueing a
    task.

    Args:
        file_path: Path to a YAML or JSON flow file.

    Returns:
        A list of action dictionaries. Every action has the keys:
        ``name``, ``operation``, ``mqtt`` and ``queue_task``. The
        ``mqtt`` entry contains the topic and payload used for
        publishing, while ``queue_task`` contains the task payload for
        internal queues.

    Raises:
        FileNotFoundError: If ``file_path`` does not exist.
        ValueError: If the file format is unsupported or an unknown step
            type is encountered.
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

    agent = AudioAgent()
    supported = set(agent.supported_operations.keys())

    actions: List[Dict[str, Any]] = []
    workflow_name = data.get("workflow_name", "flow")

    for idx, step in enumerate(steps, 1):
        step_type = step.get("type")
        if step_type not in supported:
            raise ValueError(f"Unsupported step type: {step_type}")

        request_id = f"{workflow_name}_{idx}_{uuid.uuid4().hex[:8]}"
        payload = {
            "request_id": request_id,
            "operation": step_type,
            "parameters": step.get("parameters", {}),
        }

        actions.append(
            {
                "name": step.get("name", f"step_{idx}"),
                "operation": step_type,
                "mqtt": {
                    "topic": MQTT_TOPIC,
                    "payload": payload,
                },
                "queue_task": payload,
            }
        )

    return actions
