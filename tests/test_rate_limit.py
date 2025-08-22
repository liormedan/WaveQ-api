import io
import sys
import types
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
import pytest

sys.modules.setdefault("asyncio_mqtt", types.ModuleType("asyncio_mqtt"))

import api_gateway


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(api_gateway, "UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(api_gateway, "PROCESSED_DIR", tmp_path)
    monkeypatch.setattr(api_gateway.mcp_client, "connect", AsyncMock())
    monkeypatch.setattr(api_gateway.mcp_client, "publish_request", AsyncMock(return_value=True))
    api_gateway.limiter.reset()
    with TestClient(api_gateway.app) as c:
        yield c
    api_gateway.limiter.reset()


def test_audio_edit_rate_limit(client):
    for _ in range(5):
        audio = io.BytesIO(b"test audio")
        response = client.post(
            "/api/audio/edit",
            data={"operation": "trim", "parameters": "{}"},
            files={"audio_file": ("test.wav", audio, "audio/wav")},
        )
        assert response.status_code == 200
    audio = io.BytesIO(b"test audio")
    response = client.post(
        "/api/audio/edit",
        data={"operation": "trim", "parameters": "{}"},
        files={"audio_file": ("test.wav", audio, "audio/wav")},
    )
    assert response.status_code == 429


def test_chat_audio_rate_limit(client, monkeypatch):
    monkeypatch.setattr(
        api_gateway,
        "llm_parse_request",
        lambda text: {"success": True, "data": {"operation": "trim", "parameters": {}}},
    )
    for _ in range(5):
        audio = io.BytesIO(b"test audio")
        response = client.post(
            "/api/chat/audio",
            data={"message": "trim this"},
            files={"audio_file": ("test.wav", audio, "audio/wav")},
        )
        assert response.status_code == 200
    audio = io.BytesIO(b"test audio")
    response = client.post(
        "/api/chat/audio",
        data={"message": "trim this"},
        files={"audio_file": ("test.wav", audio, "audio/wav")},
    )
    assert response.status_code == 429


def test_llm_chat_rate_limit(client, monkeypatch):
    monkeypatch.setattr(
        api_gateway,
        "llm_parse_request",
        lambda text: {"success": True, "data": {"operation": "trim", "parameters": {}}},
    )
    payload = {"messages": [{"role": "user", "content": "trim"}]}
    for _ in range(5):
        response = client.post("/api/llm/chat", json=payload)
        assert response.status_code == 200
    response = client.post("/api/llm/chat", json=payload)
    assert response.status_code == 429
