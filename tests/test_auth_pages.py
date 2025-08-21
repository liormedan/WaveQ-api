import os
import sys
import types
from fastapi.testclient import TestClient

# Provide a minimal stub for the jose library if it's missing
jose_stub = types.ModuleType("jose")

class JWTError(Exception):
    pass

jose_stub.JWTError = JWTError
jose_stub.jwt = types.SimpleNamespace(
    encode=lambda *args, **kwargs: "token",
    decode=lambda *args, **kwargs: {}
)
sys.modules.setdefault("jose", jose_stub)

# Provide a minimal stub for passlib CryptContext if passlib is missing
passlib_stub = types.ModuleType("passlib")
passlib_context_stub = types.ModuleType("passlib.context")

class CryptContext:
    def __init__(self, *args, **kwargs):
        pass

    def hash(self, password):
        return password

    def verify(self, plain_password, hashed_password):
        return plain_password == hashed_password

passlib_context_stub.CryptContext = CryptContext
sys.modules.setdefault("passlib", passlib_stub)
sys.modules.setdefault("passlib.context", passlib_context_stub)

# Ensure project root is on sys.path for module imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Create required directories for app initialization
os.makedirs("static", exist_ok=True)

import main

client = TestClient(main.app)

def test_analytics_requires_auth():
    response = client.get("/analytics")
    assert response.status_code == 401


def test_chat_requires_auth():
    response = client.get("/chat")
    assert response.status_code == 401
