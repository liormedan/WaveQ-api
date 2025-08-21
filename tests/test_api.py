import io
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
import sys
import types
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import database
import models

# Provide a minimal stub for asyncio_mqtt to avoid missing dependency
sys.modules.setdefault("asyncio_mqtt", types.ModuleType("asyncio_mqtt"))

import api_gateway


@pytest.fixture
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_path}")
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database, "SessionLocal", TestingSessionLocal)
    database.Base.metadata.create_all(bind=engine)

    monkeypatch.setattr(api_gateway, "UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(api_gateway, "PROCESSED_DIR", tmp_path)

    api_gateway.active_requests.clear()
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
    request_id = body["request_id"]
    with database.SessionLocal() as db:
        req = db.query(models.APIRequest).filter_by(request_id=request_id).first()
        assert req is not None
        assert req.status == "submitted"


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
    body = response.json()
    assert body["response"] == {"operation": "trim", "parameters": {}}
    request_id = body["request_id"]
    with database.SessionLocal() as db:
        req = db.query(models.APIRequest).filter_by(request_id=request_id).first()
        assert req.status == "completed"
        assert json.loads(req.result) == {"operation": "trim", "parameters": {}}


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


def test_cleanup_file_removes_path(tmp_path):
    temp = tmp_path / "temp.txt"
    temp.write_text("hi")
    api_gateway.cleanup_file(temp)
    assert not temp.exists()


def test_download_removes_files(client, tmp_path):
    audio = io.BytesIO(b"test audio")
    resp = client.post(
        "/api/audio/edit",
        data={"operation": "trim", "parameters": "{}"},
        files={"audio_file": ("test.wav", audio, "audio/wav")},
    )
    request_id = resp.json()["request_id"]
    original = tmp_path / f"{request_id}_test.wav"
    assert original.exists()

    original_stem = original.stem
    api_gateway.handle_status_update(request_id, "completed", {})
    assert not original.exists()

    processed = tmp_path / f"{original_stem}_out.wav"
    processed.write_bytes(b"processed")

    response = client.get(f"/api/audio/download/{request_id}")
    assert response.status_code == 200
    assert not processed.exists()

