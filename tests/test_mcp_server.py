import os
import json
import asyncio
import numpy as np
import pytest
import soundfile as sf
import types
import sys
from pathlib import Path

# Provide a minimal stub for asyncio_mqtt to allow importing the server
sys.modules.setdefault("asyncio_mqtt", types.ModuleType("asyncio_mqtt"))

# Provide a stub for audiomentations if it's not installed
if "audiomentations" not in sys.modules:
    class _StubTransform:
        def __init__(self, *args, **kwargs):
            pass

        def __call__(self, samples, sample_rate):
            return samples

    class _StubCompose:
        def __init__(self, transforms):
            self.transforms = transforms

        def __call__(self, samples, sample_rate):
            for t in self.transforms:
                samples = t(samples, sample_rate)
            return samples

    stub_module = types.ModuleType("audiomentations")
    stub_module.Compose = _StubCompose
    stub_module.AddGaussianNoise = _StubTransform
    stub_module.PitchShift = _StubTransform
    sys.modules["audiomentations"] = stub_module

# Ensure the project root is on the path when running tests directly
ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from mcp_audio_server import AudioProcessingMCP


@pytest.fixture
def sample_wav(tmp_path):
    sr = 22050
    t = np.linspace(0, 1, sr, False)
    tone = 0.5 * np.sin(2 * np.pi * 440 * t)
    file_path = tmp_path / "sample.wav"
    sf.write(file_path, tone, sr)
    return str(file_path)


@pytest.mark.parametrize(
    "operation,params",
    [
        ("trim_audio", {"start_time": 0, "end_time": 0.5}),
        ("normalize_audio", {"target_db": -3}),
        ("fade_in_audio", {"fade_duration": 100}),
        ("fade_out_audio", {"fade_duration": 100}),
        ("change_speed", {"speed_factor": 1.5}),
        ("change_pitch", {"pitch_steps": 2}),
        ("add_reverb", {"room_size": 0.1, "damping": 0.1}),
        ("noise_reduction", {"strength": 0.1}),
        ("equalize_audio", {"low_gain": 1.0, "mid_gain": 1.0, "high_gain": 1.0}),
        ("compress_audio", {"threshold": -20}),
        ("augment_audio", {"noise_level": 0.01, "pitch_shift": 1}),
    ],
)
def test_audio_operations(sample_wav, operation, params):
    server = AudioProcessingMCP()
    method = getattr(server, operation)
    result = asyncio.run(method(sample_wav, params))
    assert os.path.exists(result["output_path"])


def test_merge_audio_files(sample_wav, tmp_path):
    second_path = tmp_path / "second.wav"
    sr = 22050
    sf.write(second_path, np.zeros(sr), sr)
    server = AudioProcessingMCP()
    result = asyncio.run(
        server.merge_audio_files(sample_wav, {"additional_files": [str(second_path)]})
    )
    assert os.path.exists(result["output_path"])
    assert len(result["merged_files"]) == 2


def test_split_audio(sample_wav):
    server = AudioProcessingMCP()
    result = asyncio.run(server.split_audio(sample_wav, {"segment_duration": 1}))
    assert result["total_segments"] >= 1
    for path in result["segment_paths"]:
        assert os.path.exists(path)


def test_convert_format(sample_wav):
    server = AudioProcessingMCP()
    result = asyncio.run(server.convert_format(sample_wav, {"target_format": "wav"}))
    assert os.path.exists(result["output_path"])


def test_process_operations(sample_wav):
    server = AudioProcessingMCP()
    ops = [
        {"name": "trim", "start": 0, "end": 0.5},
        {"name": "augment", "noise_level": 0.01, "pitch_shift": 0},
        {"name": "fade_in", "duration": 100},
    ]
    out_path = asyncio.run(server.process_operations(sample_wav, ops))
    assert os.path.exists(out_path)


class FakeTopic:
    def __init__(self, value):
        self.value = value


class FakeMessage:
    def __init__(self, topic, payload):
        self.topic = FakeTopic(topic)
        self.payload = payload


class FakeMQTTClient:
    def __init__(self):
        self.incoming = asyncio.Queue()
        self.published = []

    async def publish(self, topic, payload):
        self.published.append((topic, json.loads(payload)))

    async def subscribe(self, topic):
        pass

    def messages(self):
        client = self

        class _CM:
            async def __aenter__(self_inner):
                return self_inner

            async def __aexit__(self_inner, exc_type, exc, tb):
                pass

            def __aiter__(self_inner):
                return self_inner

            async def __anext__(self_inner):
                return await client.incoming.get()

        return _CM()


def test_full_mqtt_flow(sample_wav):
    async def run_flow():
        server = AudioProcessingMCP()
        client = FakeMQTTClient()

        tasks = [
            asyncio.create_task(server.handle_mqtt_messages(client)),
            asyncio.create_task(server.process_audio_requests(client)),
        ]

        payload = {
            "request_id": "req1",
            "operation": "trim",
            "audio_data": sample_wav,
            "parameters": {"start_time": 0, "end_time": 0.5},
        }
        await client.incoming.put(
            FakeMessage("audio/edit", json.dumps(payload).encode())
        )

        for _ in range(20):
            if any(topic == "audio/results/req1" for topic, _ in client.published):
                break
            await asyncio.sleep(0.2)
        else:
            assert False, "result not published"

        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

        assert any(topic == "audio/results/req1" for topic, _ in client.published)
        assert any(topic == "audio/status/req1" for topic, _ in client.published)

    asyncio.run(run_flow())
