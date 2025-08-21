import io
from unittest.mock import AsyncMock
import types
import sys
import shutil
from pathlib import Path
import soundfile as sf

import pytest
from fastapi.testclient import TestClient

# Minimal stubs for optional dependencies
# Replicate stubs used in other tests
ta = types.ModuleType("torchaudio")

def _load(path):
    data, sr = sf.read(path)
    if data.ndim == 1:
        data = data[None, :]
    return data, sr


def _save(path, waveform, sr):
    sf.write(path, waveform.T, sr)


class _SoxEffects:
    @staticmethod
    def apply_effects_tensor(waveform, sr, effects):
        rate = float(effects[0][1]) if effects else 1.0
        import librosa
        stretched = librosa.effects.time_stretch(waveform[0], rate=rate)
        return stretched[None, :], sr


ta.load = _load
ta.save = _save
ta.sox_effects = _SoxEffects()
sys.modules.setdefault("torchaudio", ta)

ff = types.ModuleType("ffmpeg")


class FFError(Exception):
    pass


def _ffmpeg_input(path):
    return path


def _ffmpeg_output(stream, out_path, format=None, **_):
    return stream, out_path, format


def _ffmpeg_run(args, overwrite_output=True):
    src, dst, fmt = args
    if fmt == "invalid":
        raise FFError("Unsupported format")
    shutil.copyfile(src, dst)


ff.input = _ffmpeg_input
ff.output = _ffmpeg_output
ff.run = _ffmpeg_run
ff.Error = FFError
sys.modules.setdefault("ffmpeg", ff)

import api_gateway


@pytest.fixture
def client(tmp_path, monkeypatch):
    api_gateway.active_requests.clear()
    monkeypatch.setattr(api_gateway, "UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(api_gateway, "PROCESSED_DIR", tmp_path)

    async def fake_publish_request(request_id, payload):
        src = Path(payload["audio_path"])
        out_path = tmp_path / f"{src.stem}_processed{src.suffix}"
        shutil.copyfile(src, out_path)
        result = {"output_path": str(out_path)}
        await api_gateway.update_request(
            request_id,
            status="completed",
            result=result,
            file_path=str(src),
        )
        return True

    monkeypatch.setattr(api_gateway.mcp_client, "connect", AsyncMock())
    monkeypatch.setattr(api_gateway.mcp_client, "publish_request", fake_publish_request)
    monkeypatch.setattr(api_gateway.mcp_client, "subscribe_to_status", AsyncMock(return_value=True))

    with TestClient(api_gateway.app) as c:
        yield c


def test_full_workflow(client):
    audio = io.BytesIO(b"test audio")
    resp = client.post(
        "/api/audio/edit",
        data={"operation": "trim", "parameters": "{\"start_time\": 0, \"end_time\": 0.5}"},
        files={"audio_file": ("test.wav", audio, "audio/wav")},
    )
    assert resp.status_code == 200
    request_id = resp.json()["request_id"]

    # Request should be completed and listed for dashboard
    list_resp = client.get("/api/audio/requests")
    assert list_resp.status_code == 200
    req = next(r for r in list_resp.json()["requests"] if r["request_id"] == request_id)
    assert req["status"] == "completed"

    download = client.get(f"/api/audio/download/{request_id}")
    assert download.status_code == 200
    assert len(download.content) > 0
