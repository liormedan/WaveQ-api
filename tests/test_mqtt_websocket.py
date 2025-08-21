import socket

import paho.mqtt.client as mqtt
import pytest


def test_websocket_connectivity():
    """Ensure MQTT broker accepts WebSocket connections.

    If the broker isn't running on the default port, the test is skipped.
    """
    try:
        # Quick check to see if the port is open to avoid long timeouts
        sock = socket.create_connection(("localhost", 9001), timeout=2)
        sock.close()
    except OSError:
        pytest.skip("Mosquitto broker with WebSocket support is not running")

    client = mqtt.Client(transport="websockets")
    client.connect("localhost", 9001, 60)
    client.disconnect()
