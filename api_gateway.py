"""API Gateway for orchestrating audio workflows."""

import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from orchestrator import WorkflowOrchestrator

app = FastAPI(title="WaveQ API Gateway")

# Initialize orchestrator
orchestrator = WorkflowOrchestrator(
    redis_url=os.getenv("REDIS_URL"),
    mqtt_broker=os.getenv("MCP_MQTT_BROKER"),
    mqtt_port=os.getenv("MCP_MQTT_PORT"),
)


class WorkflowRequest(BaseModel):
    workflow_name: str
    audio_path: str
    client_id: str


@app.post("/api/audio/edit")
def enqueue_workflow(req: WorkflowRequest):
    """Submit a workflow to the orchestrator."""
    try:
        return orchestrator.enqueue_workflow(
            req.workflow_name, req.audio_path, req.client_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
