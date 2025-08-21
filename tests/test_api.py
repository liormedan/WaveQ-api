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
    audio = io.BytesIO(b"test audio")
    response = client.post(
        "/api/audio/edit",
        data={
            "operation": "trim",
            "parameters": "{}",
            "client_id": "tester",
        },
        files={"audio_file": ("test.wav", audio, "audio/wav")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "submitted"
    assert "request_id" in body


def test_audio_edit_invalid_operation(client):
    audio = io.BytesIO(b"test audio")
    response = client.post(
        "/api/audio/edit",
        data={"operation": "unknown", "parameters": "{}"},
        files={"audio_file": ("test.wav", audio, "audio/wav")},
    )
    assert response.status_code == 400


def test_audio_edit_bad_json(client):
    audio = io.BytesIO(b"test audio")
    response = client.post(
        "/api/audio/edit",
        data={"operation": "trim", "parameters": "{bad json}"},
        files={"audio_file": ("test.wav", audio, "audio/wav")},
    )
    assert response.status_code == 400


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


def test_chat_audio_success(client, monkeypatch):
    def fake_parse(text):
        return {"success": True, "data": {"operation": "trim", "parameters": {}}}

    monkeypatch.setattr(api_gateway, "llm_parse_request", fake_parse)
    audio = io.BytesIO(b"test audio")
    response = client.post(
        "/api/chat/audio",
        data={"message": "trim this audio"},
        files={"audio_file": ("test.wav", audio, "audio/wav")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "submitted"
    assert "request_id" in body


def test_chat_audio_llm_error(client, monkeypatch):
    def fake_parse(text):
        return {"success": False, "error": "bad"}

    monkeypatch.setattr(api_gateway, "llm_parse_request", fake_parse)
    audio = io.BytesIO(b"test audio")
    response = client.post(
        "/api/chat/audio",
        data={"message": "trim"},
        files={"audio_file": ("test.wav", audio, "audio/wav")},
    )
    assert response.status_code == 502


def test_supported_operations_include_time_stretch(client):
    response = client.get("/api/audio/operations")
    assert response.status_code == 200
    ops = response.json()["operations"]
    assert "time_stretch_torch" in ops
