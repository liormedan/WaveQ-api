import io
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
import sys
import types

# Provide a minimal stub for asyncio_mqtt to avoid missing dependency
sys.modules.setdefault("asyncio_mqtt", types.ModuleType("asyncio_mqtt"))

import api_gateway


@pytest.fixture
def client(tmp_path, monkeypatch):
    # Redirect file storage to temporary directory
    monkeypatch.setattr(api_gateway, "UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(api_gateway, "PROCESSED_DIR", tmp_path)
    # Mock MQTT interactions
    monkeypatch.setattr(api_gateway.mcp_client, "connect", AsyncMock())
    monkeypatch.setattr(api_gateway.mcp_client, "publish_request", AsyncMock(return_value=True))

    with TestClient(api_gateway.app) as c:
        yield c


def test_audio_edit_success(client):
    payload = {
        "file_path": "test.wav",
        "operations": [{"operation": "trim", "parameters": {}}],
        "client_id": "tester",
    }
    response = client.post("/api/audio/edit", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "submitted"
    assert "request_id" in body


def test_audio_edit_invalid_operation(client):
    payload = {
        "file_path": "test.wav",
        "operations": "not-a-list",
    }
    response = client.post("/api/audio/edit", json=payload)
    assert response.status_code == 422


def test_audio_edit_bad_json(client):
    response = client.post(
        "/api/audio/edit", data="{bad json}", headers={"content-type": "application/json"}
    )
    assert response.status_code == 422


def test_llm_chat_success(client, monkeypatch):
    def fake_parse(text):
        return {"success": True, "data": {"operation": "trim", "parameters": {}}}

    monkeypatch.setattr(api_gateway, "llm_parse_request", fake_parse)
    payload = {"messages": [{"role": "user", "content": "trim the audio"}]}
    response = client.post("/api/llm/chat", json=payload)
    assert response.status_code == 200
    assert response.json()["response"] == {"operation": "trim", "parameters": {}}


def test_llm_chat_malformed_response(client, monkeypatch):
    def fake_parse(text):
        return {"success": False, "error": "bad"}

    monkeypatch.setattr(api_gateway, "llm_parse_request", fake_parse)
    payload = {"messages": [{"role": "user", "content": "trim"}]}
    response = client.post("/api/llm/chat", json=payload)
    assert response.status_code == 502


def test_llm_chat_unavailable(client, monkeypatch):
    def fake_parse(text):
        raise RuntimeError("down")

    monkeypatch.setattr(api_gateway, "llm_parse_request", fake_parse)
    payload = {"messages": [{"role": "user", "content": "trim"}]}
    response = client.post("/api/llm/chat", json=payload)
    assert response.status_code == 503
