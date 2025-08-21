import asyncio
import logging
import types
from unittest.mock import AsyncMock
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

import api_gateway


class DummyClient:
    def __init__(self, *args, **kwargs):
        pass

    async def connect(self):
        pass

    async def disconnect(self):
        pass

    async def subscribe(self, topic):
        pass


def test_mqtt_connect_disconnect_logs(monkeypatch, caplog):
    monkeypatch.setattr(
        api_gateway,
        "aiomqtt",
        types.SimpleNamespace(Client=DummyClient),
        raising=False,
    )
    monkeypatch.setattr(api_gateway.MCPClient, "listen_status_updates", AsyncMock())
    client = api_gateway.MCPClient()

    async def run():
        with caplog.at_level(logging.INFO):
            await client.connect()
            await client.disconnect()

    asyncio.run(run())

    messages = caplog.messages
    assert any("Connected to MQTT broker" in m for m in messages)
    assert any("Disconnected from MQTT broker" in m for m in messages)
