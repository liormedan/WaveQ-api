from fastapi import FastAPI, HTTPException, Depends, Header, status, File, UploadFile, Form
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional, Tuple
import asyncio
import json
import os
import uuid
from datetime import datetime
import shutil
from pathlib import Path
import subprocess
import tempfile
import sys
import logging  # added

from sqlalchemy.orm import Session

import database
from database import get_db
from crud import (
    create_request,
    update_request_status,
    get_request as db_get_request,
    list_requests as db_list_requests,
)
from models import APIRequest

from dotenv import load_dotenv

import asyncio_mqtt as aiomqtt


# Optional deps
try:
    import redis.asyncio as redis
except ImportError:  # redis is optional
    redis = None

try:
    import aiomqtt  # added: MQTT async client
except ImportError:
    aiomqtt = None

# Load environment variables
load_dotenv("config.env", override=True)

# Security configuration
API_KEY_REQUIRED = os.getenv("API_KEY_REQUIRED", "false").lower() == "true"
API_KEY_HEADER = os.getenv("API_KEY_HEADER", "X-API-Key")
API_KEY = os.getenv("API_KEY", "")

async def verify_api_key(api_key: str = Header(None, alias=API_KEY_HEADER)):
    if not API_KEY_REQUIRED:
        return
    if not api_key or api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )

app = FastAPI(
    title="WaveQ Audio API Gateway",
    description="API Gateway for Audio Processing MCP Server",
    version="1.0.0",
    dependencies=[Depends(verify_api_key)],
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('api_gateway.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configuration
MCP_MQTT_BROKER = os.getenv("MCP_MQTT_BROKER", "localhost")
MCP_MQTT_PORT = int(os.getenv("MCP_MQTT_PORT", "1883"))
UPLOAD_DIR = "uploads"
PROCESSED_DIR = "processed"
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

if redis:
    redis_client = redis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
else:
    redis_client = None

# =========================
# Request models
# =========================
class AudioOperation(BaseModel):
    operation: str
    parameters: Dict[str, Any] = {}

class AudioEditRequest(BaseModel):
    file_path: str
    operations: List[AudioOperation]
    client_id: Optional[str] = None
    priority: Optional[str] = "normal"
    description: Optional[str] = ""

class AudioEditUploadRequest(BaseModel):
    operation: str
    parameters: Dict[str, Any]
    client_id: Optional[str] = None
    priority: Optional[str] = "normal"
    description: Optional[str] = ""

class AudioEditResponse(BaseModel):
    request_id: str
    status: str
    message: str
    timestamp: str
    estimated_completion: Optional[str] = None

class ProcessingStatus(BaseModel):
    request_id: str
    status: str
    message: str
    progress: Optional[float] = None
    result: Optional[Dict[str, Any]] = None
    timestamp: str

class ChatRequest(BaseModel):
    messages: List[Dict[str, Any]]
    client_id: Optional[str] = None

class CodeRunRequest(BaseModel):
    language: str
    code: str

class CodeRunResponse(BaseModel):
    output: str
    errors: str

# =========================
# Helpers
# =========================
async def parse_request(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Parse chat request payload using the LLM service."""
    messages = payload.get("messages", [])
    if not messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    text = messages[-1].get("content")
    if not text:
        raise HTTPException(status_code=400, detail="No message content")

    try:
        result = await asyncio.to_thread(llm_parse_request, text)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"LLM service unavailable: {exc}") from exc

    if not isinstance(result, dict) or not result.get("success") or "data" not in result:
        error_msg = result.get("error") if isinstance(result, dict) else "Unknown error"
        raise HTTPException(status_code=502, detail=f"Invalid response from LLM: {error_msg}")

    return result["data"]

def _execute_python(code: str) -> Tuple[str, str]:
    """Execute Python code in a temporary file and return output and errors."""
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as tmp:
        tmp.write(code)
        tmp_path = tmp.name
    try:
        completed = subprocess.run(
            [sys.executable, tmp_path],
            capture_output=True,
            text=True,
            timeout=5,
            env={"PYTHONIOENCODING": "utf-8"},
            cwd="/tmp",
        )
        return completed.stdout, completed.stderr
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass

# =========================
# MQTT Client for MCP communication
# =========================
class MCPClient:
    def __init__(self):
        self.client = None
        self.client_id = f"api_gateway_{uuid.uuid4().hex[:8]}"
        self.connected = False
        self.status_task = None

    async def connect(self):
        """Connect to MQTT broker"""
        if aiomqtt is None:
            logger.error("aiomqtt is not installed; cannot connect to MQTT.")
            self.connected = False
            return
        try:
            self.client = aiomqtt.Client(
                hostname=MCP_MQTT_BROKER,
                port=MCP_MQTT_PORT,
                identifier=self.client_id
            )
            await self.client.connect()
            self.connected = True
            # Subscribe to all status updates
            await self.client.subscribe("audio/status/#")
            # Start background listener for status messages
            self.status_task = asyncio.create_task(self.listen_status_updates())
            logger.info(
                f"Connected to MQTT broker at {MCP_MQTT_BROKER}:{MCP_MQTT_PORT}"
            )
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")
            self.connected = False

    async def disconnect(self):
        """Disconnect from MQTT broker"""
        if self.client and self.connected:
            if self.status_task:
                self.status_task.cancel()
            await self.client.disconnect()
            self.connected = False
            logger.info("Disconnected from MQTT broker")

    async def publish_request(self, request_id: str, payload: Dict[str, Any]):
        """Publish audio processing request to MCP server"""
        if not self.connected:
            await self.connect()
        if self.connected:
            topic = "audio/edit"
            try:
                await self.client.publish(topic, json.dumps(payload))
                return True
            except Exception as e:
                logger.error(f"MQTT publish failed: {e}")
        return False

    async def subscribe_to_status(self, request_id: str):
        """Subscribe to status updates for a specific request"""
        if not self.connected:
            await self.connect()
        return self.connected

    async def listen_status_updates(self):
        """Background task to listen for status updates"""
        if not self.client:
            return
        try:
            async with self.client.messages() as messages:
                async for message in messages:
                    topic = message.topic.value
                    if not topic.startswith("audio/status/"):
                        continue
                    try:
                        payload = json.loads(message.payload.decode())
                        req_id = payload.get("request_id")
                        if req_id:
                            with database.SessionLocal() as db:
                                update_request_status(
                                    db,
                                    req_id,
                                    status=payload.get("status", "unknown"),
                                    progress=payload.get("progress"),
                                    result=payload.get("result"),
                                )
                    except Exception as e:
                        logger.error(f"Error processing status message: {e}")
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"MQTT listen loop error: {e}")

# Global MCP client
mcp_client = MCPClient()

# =========================
# In-memory / Redis request cache
# =========================
active_requests: Dict[str, Dict[str, Any]] = {}

async def save_request(request_id: str, data: Dict[str, Any]):
    """Save request data to memory and Redis if available"""
    active_requests[request_id] = data
    if redis_client:
        try:
            await redis_client.set(f"request:{request_id}", json.dumps(data))
        except Exception as e:
            logger.error(f"Redis save error: {e}")

async def get_request(request_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve request data from Redis or memory"""
    if redis_client:
        try:
            stored = await redis_client.get(f"request:{request_id}")
            if stored:
                return json.loads(stored)
        except Exception as e:
            logger.error(f"Redis get error: {e}")
    return active_requests.get(request_id)

async def update_request(request_id: str, **fields):
    data = await get_request(request_id) or {}
    data.update(fields)
    await save_request(request_id, data)

# =========================
# Lifecycle
# =========================
@app.on_event("startup")
async def startup_event():
    """Initialize MCP client on startup"""
    database.Base.metadata.create_all(bind=database.engine)
    await mcp_client.connect()

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await mcp_client.disconnect()

# =========================
# Routes
# =========================
@app.post("/api/audio/edit", response_model=AudioEditResponse)
async def submit_audio_edit(
    audio_file: UploadFile = File(...),
    operation: str = Form(...),
    parameters: str = Form("{}"),
    client_id: Optional[str] = Form(None),
    priority: Optional[str] = Form("normal"),
    description: Optional[str] = Form(""),
    db: Session = Depends(get_db),
):
    """Submit an audio editing request via multipart form data"""
    try:
        try:
            params_dict = json.loads(parameters)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON for parameters")

        form = AudioEditUploadRequest(
            operation=operation,
            parameters=params_dict,
            client_id=client_id,
            priority=priority,
            description=description,
        )

        supported = (await get_supported_operations())["operations"]
        if form.operation not in supported:
            raise HTTPException(status_code=400, detail="Unsupported operation")

        request_id = str(uuid.uuid4())

        filename = f"{request_id}_{audio_file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)

        payload = {
            "request_id": request_id,
            "operations": [
                {"operation": form.operation, "parameters": form.parameters}
            ],
            "audio_path": file_path,
            "client_id": form.client_id,
            "priority": form.priority,
            "description": form.description,
            "timestamp": datetime.now().isoformat(),
        }

        create_request(
            db,
            request_id,
            status="submitted",
            file_path=file_path,
            payload=payload,
            client_id=form.client_id,
        )

        success = await mcp_client.publish_request(request_id, payload)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to submit to MCP server")

        await mcp_client.subscribe_to_status(request_id)

        return AudioEditResponse(
            request_id=request_id,
            status="submitted",
            message="Audio edit request submitted successfully",
            timestamp=datetime.now().isoformat(),
            estimated_completion=None,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

@app.post("/api/chat/audio")
async def chat_audio(
    message: str = Form(...),
    audio_file: UploadFile = File(...),
    client_id: Optional[str] = Form(None),
    priority: Optional[str] = Form("normal"),
    description: Optional[str] = Form(""),
    db: Session = Depends(get_db),
):
    """Handle natural language audio processing requests with file upload"""
    try:
        try:
            result = await asyncio.to_thread(llm_parse_request, message)
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"LLM service unavailable: {exc}") from exc

        if not isinstance(result, dict) or not result.get("success") or "data" not in result:
            error_msg = result.get("error") if isinstance(result, dict) else "Unknown error"
            raise HTTPException(status_code=502, detail=f"Invalid response from LLM: {error_msg}")

        data = result["data"]
        operation = data.get("operation")
        parameters = data.get("parameters", {})
        if not operation:
            raise HTTPException(status_code=502, detail="Invalid response from LLM: missing operation")

        request_id = str(uuid.uuid4())
        filename = f"{request_id}_{audio_file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)

        payload = {
            "request_id": request_id,
            "audio_path": file_path,
            "operations": [
                {"operation": operation, "parameters": parameters}
            ],
            "client_id": client_id,
            "priority": priority,
            "description": description,
            "timestamp": datetime.now().isoformat(),
        }

        create_request(
            db,
            request_id,
            status="submitted",
            file_path=file_path,
            payload=payload,
            client_id=client_id,
        )

        success = await mcp_client.publish_request(request_id, payload)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to submit to MCP server")

        await mcp_client.subscribe_to_status(request_id)

        return {"request_id": request_id, "status": "submitted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

@app.post("/api/llm/chat")
async def llm_chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Handle chat requests for LLM processing"""
    request_id = str(uuid.uuid4())
    payload = request.dict()
    create_request(
        db,
        request_id,
        status="submitted",
        payload=payload,
        client_id=request.client_id,
    )
    try:
        result = await parse_request(payload)
    except HTTPException as exc:
        update_request_status(
            db,
            request_id,
            status="failed",
            result={"error": exc.detail},
        )
        raise
    except Exception as exc:
        update_request_status(
            db,
            request_id,
            status="failed",
            result={"error": str(exc)},
        )
        raise HTTPException(
            status_code=500, detail=f"Error processing request: {exc}"
        ) from exc

    update_request_status(db, request_id, status="completed", result=result)
    return {"request_id": request_id, "response": result}

@app.post("/api/run-code", response_model=CodeRunResponse)
async def run_code(request: CodeRunRequest):
    """Run small code snippets in a restricted subprocess."""
    if request.language.lower() != "python":
        raise HTTPException(status_code=400, detail="Unsupported language")
    if len(request.code) > 1000:
        raise HTTPException(status_code=400, detail="Code too long")
    try:
        stdout, stderr = await asyncio.to_thread(_execute_python, request.code)
    except subprocess.TimeoutExpired:
        return CodeRunResponse(output="", errors="Execution timed out")
    return CodeRunResponse(output=stdout, errors=stderr)

@app.get("/api/audio/status/{request_id}", response_model=ProcessingStatus)
async def get_processing_status(request_id: str, db: Session = Depends(get_db)):
    """Get the current status of an audio processing request"""
    request_obj = db_get_request(db, request_id)
    if not request_obj:
        raise HTTPException(status_code=404, detail="Request not found")

    return ProcessingStatus(
        request_id=request_id,
        status=request_obj.status,
        message=f"Request {request_obj.status}",
        progress=request_obj.progress,
        result=json.loads(request_obj.result) if request_obj.result else None,
        timestamp=request_obj.submitted_at.isoformat(),
    )

@app.get("/api/audio/requests")
async def list_requests(
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """List all audio processing requests with optional filtering"""
    requests = db_list_requests(db, client_id=client_id, status=status, limit=limit)
    data = [
        {
            "request_id": r.request_id,
            "status": r.status,
            "client_id": r.client_id,
            "submitted_at": r.submitted_at.isoformat(),
            "file_path": r.file_path,
        }
        for r in requests
    ]
    return {"requests": data, "total": len(data), "limit": limit}

@app.get("/api/audio/download/{request_id}")
async def download_processed_audio(request_id: str, db: Session = Depends(get_db)):
    """Download the processed audio file"""
    request_obj = db_get_request(db, request_id)
    if not request_obj:
        raise HTTPException(status_code=404, detail="Request not found")

    if request_obj.status != "completed":
        raise HTTPException(status_code=400, detail="Audio processing not completed")

    # Look for processed file
    original_file = Path(request_obj.file_path)
    processed_files = list(original_file.parent.glob(f"{original_file.stem}_*"))

    if not processed_files:
        raise HTTPException(status_code=404, detail="Processed file not found")

    # Return the most recent processed file
    latest_file = max(processed_files, key=lambda x: x.stat().st_mtime)

    return FileResponse(
        path=str(latest_file),
        filename=latest_file.name,
        media_type="audio/wav"
    )

@app.delete("/api/audio/requests/{request_id}")
async def cancel_request(request_id: str, db: Session = Depends(get_db)):
    """Cancel a pending audio processing request"""
    request_obj = db_get_request(db, request_id)
    if not request_obj:
        raise HTTPException(status_code=404, detail="Request not found")

    if request_obj.status in ["completed", "failed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot cancel completed/failed request")

    update_request_status(db, request_id, status="cancelled")

    if request_obj.file_path and os.path.exists(request_obj.file_path):
        try:
            os.remove(request_obj.file_path)
        except OSError as e:
            logger.warning(f"Failed to remove file {request_obj.file_path}: {e}")

    return {"message": "Request cancelled successfully", "request_id": request_id}

@app.get("/api/audio/operations")
async def get_supported_operations():
    """Get list of supported audio processing operations"""
    operations = {
        "trim": {
            "description": "Trim audio to specified start and end times",
            "parameters": {
                "start_time": {"type": "float", "description": "Start time in seconds", "default": 0},
                "end_time": {"type": "float", "description": "End time in seconds", "default": "end of file"}
            }
        },
        "normalize": {
            "description": "Normalize audio to target dB level",
            "parameters": {
                "target_db": {"type": "float", "description": "Target dB level", "default": -20}
            }
        },
        "fade_in": {
            "description": "Apply fade in effect",
            "parameters": {
                "fade_duration": {"type": "float", "description": "Fade duration in seconds", "default": 1.0}
            }
        },
        "fade_out": {
            "description": "Apply fade out effect",
            "parameters": {
                "fade_duration": {"type": "float", "description": "Fade duration in seconds", "default": 1.0}
            }
        },
        "change_speed": {
            "description": "Change audio playback speed",
            "parameters": {
                "speed_factor": {"type": "float", "description": "Speed multiplier", "default": 1.0}
            }
        },
        "change_pitch": {
            "description": "Change audio pitch",
            "parameters": {
                "pitch_steps": {"type": "float", "description": "Pitch change in semitones", "default": 0}
            }
        },
        "time_stretch_torch": {
            "description": "Time stretch audio using torchaudio",
            "parameters": {
                "rate": {"type": "float", "description": "Stretch factor", "default": 1.0},
            }
        },
        "add_reverb": {
            "description": "Add reverb effect",
            "parameters": {
                "room_size": {"type": "float", "description": "Room size (0-1)", "default": 0.5},
                "damping": {"type": "float", "description": "Damping factor (0-1)", "default": 0.5}
            }
        },
        "noise_reduction": {
            "description": "Reduce noise in audio",
            "parameters": {
                "strength": {"type": "float", "description": "Noise reduction strength (0-1)", "default": 0.1}
            }
        },
        "equalize": {
            "description": "Apply 3-band equalization",
            "parameters": {
                "low_gain": {"type": "float", "description": "Low frequency gain", "default": 1.0},
                "mid_gain": {"type": "float", "description": "Mid frequency gain", "default": 1.0},
                "high_gain": {"type": "float", "description": "High frequency gain", "default": 1.0}
            }
        },
        "compress": {
            "description": "Apply dynamic range compression",
            "parameters": {
                "threshold": {"type": "float", "description": "Compression threshold in dB", "default": -20},
                "ratio": {"type": "float", "description": "Compression ratio", "default": 4.0},
                "attack": {"type": "float", "description": "Attack time in seconds", "default": 0.005},
                "release": {"type": "float", "description": "Release time in seconds", "default": 0.1}
            }
        },
        "voice_activity_detection": {
            "description": "Detect speech segments or remove silence",
            "parameters": {
                "remove_silence": {"type": "boolean", "description": "Remove silent sections", "default": False},
                "aggressiveness": {"type": "integer", "description": "VAD aggressiveness (0-3)", "default": 2},
            }
        },
        "merge": {
            "description": "Merge multiple audio files",
            "parameters": {
                "additional_files": {"type": "list", "description": "List of additional audio files to merge", "default": []}
            }
        },
        "split": {
            "description": "Split audio into segments",
            "parameters": {
                "segment_duration": {"type": "float", "description": "Duration of each segment in seconds", "default": 30}
            }
        },
        "convert_format": {
            "description": "Convert audio to different format with optional bitrate, sample rate and channels",
            "parameters": {
                "target_format": {"type": "string", "description": "Target audio format", "default": "mp3"},
                "bitrate": {"type": "string", "description": "Audio bitrate e.g. '128k'", "default": "192k"},
                "sample_rate": {"type": "int", "description": "Sample rate in Hz", "default": 44100},
                "channels": {"type": "int", "description": "Number of audio channels", "default": 2},
            }
        }
    }
    return {
        "operations": operations,
        "total_operations": len(operations)
    }

@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    mcp_status = "connected" if mcp_client.connected else "disconnected"
    active_count = db.query(APIRequest).count()
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "mcp_server": mcp_status,
        "active_requests": active_count,
    }

# Background task to monitor MCP server status
async def monitor_mcp_status():
    """Monitor MCP server connection status"""
    while True:
        try:
            if not mcp_client.connected:
                await mcp_client.connect()
            await asyncio.sleep(30)  # Check every 30 seconds
        except Exception as e:
            logger.error(f"Error monitoring MCP status: {e}")
            await asyncio.sleep(60)  # Wait longer on error

# Start monitoring task
@app.on_event("startup")
async def start_monitoring():
    asyncio.create_task(monitor_mcp_status())

if __name__ == "__main__":
    import uvicorn
    # Security: Use environment variable for host, default to 0.0.0.0 for production
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8002"))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    uvicorn.run(app, host=host, port=port, log_level="info" if not debug else "debug")
