from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import asyncio
import json
import os
import uuid
from datetime import datetime
import tempfile
import shutil
from pathlib import Path

# MQTT client for communication with MCP server
import asyncio_mqtt as aiomqtt

app = FastAPI(
    title="WaveQ Audio API Gateway",
    description="API Gateway for Audio Processing MCP Server",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
MCP_MQTT_BROKER = os.getenv("MCP_MQTT_BROKER", "localhost")
MCP_MQTT_PORT = int(os.getenv("MCP_MQTT_PORT", "1883"))
UPLOAD_DIR = "uploads"
PROCESSED_DIR = "processed"

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

# Request models
class AudioEditRequest(BaseModel):
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

# MQTT Client for MCP communication
class MCPClient:
    def __init__(self):
        self.client = None
        self.client_id = f"api_gateway_{uuid.uuid4().hex[:8]}"
        self.connected = False
    
    async def connect(self):
        """Connect to MQTT broker"""
        try:
            self.client = aiomqtt.Client(
                hostname=MCP_MQTT_BROKER,
                port=MCP_MQTT_PORT,
                identifier=self.client_id
            )
            await self.client.connect()
            self.connected = True
            print(f"Connected to MQTT broker at {MCP_MQTT_BROKER}:{MCP_MQTT_PORT}")
        except Exception as e:
            print(f"Failed to connect to MQTT broker: {e}")
            self.connected = False
    
    async def disconnect(self):
        """Disconnect from MQTT broker"""
        if self.client and self.connected:
            await self.client.disconnect()
            self.connected = False
    
    async def publish_request(self, request_id: str, payload: Dict[str, Any]):
        """Publish audio processing request to MCP server"""
        if not self.connected:
            await self.connect()
        
        if self.connected:
            topic = f"audio/requests/{request_id}"
            await self.client.publish(topic, json.dumps(payload))
            return True
        return False
    
    async def subscribe_to_status(self, request_id: str):
        """Subscribe to status updates for a specific request"""
        if not self.connected:
            await self.connect()
        
        if self.connected:
            topic = f"audio/status/{request_id}"
            await self.client.subscribe(topic)
            return True
        return False

# Global MCP client
mcp_client = MCPClient()

# Request tracking
active_requests = {}

@app.on_event("startup")
async def startup_event():
    """Initialize MCP client on startup"""
    await mcp_client.connect()

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await mcp_client.disconnect()

@app.post("/api/audio/edit", response_model=AudioEditResponse)
async def submit_audio_edit(
    audio_file: UploadFile = File(...),
    operation: str = Form(...),
    parameters: str = Form("{}"),
    client_id: Optional[str] = Form(None),
    priority: str = Form("normal"),
    description: str = Form("")
):
    """
    Submit an audio editing request from n8n
    
    This endpoint receives audio files and processing requests from n8n workflows
    and forwards them to the MCP server for processing.
    """
    try:
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        
        # Parse parameters
        try:
            params_dict = json.loads(parameters) if parameters else {}
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid parameters JSON")
        
        # Validate operation
        supported_operations = [
            "trim", "normalize", "fade_in", "fade_out", "change_speed",
            "change_pitch", "add_reverb", "noise_reduction", "equalize",
            "compress", "merge", "split", "convert_format"
        ]
        
        if operation not in supported_operations:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported operation. Supported: {', '.join(supported_operations)}"
            )
        
        # Save uploaded file
        file_extension = Path(audio_file.filename).suffix
        saved_filename = f"{request_id}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, saved_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)
        
        # Create request payload
        payload = {
            "request_id": request_id,
            "operation": operation,
            "audio_data": file_path,
            "parameters": params_dict,
            "client_id": client_id,
            "priority": priority,
            "description": description,
            "timestamp": datetime.now().isoformat()
        }
        
        # Track request
        active_requests[request_id] = {
            "status": "submitted",
            "file_path": file_path,
            "payload": payload,
            "submitted_at": datetime.now(),
            "client_id": client_id
        }
        
        # Submit to MCP server
        success = await mcp_client.publish_request(request_id, payload)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to submit to MCP server")
        
        # Subscribe to status updates
        await mcp_client.subscribe_to_status(request_id)
        
        return AudioEditResponse(
            request_id=request_id,
            status="submitted",
            message="Audio edit request submitted successfully",
            timestamp=datetime.now().isoformat(),
            estimated_completion=None
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

@app.get("/api/audio/status/{request_id}", response_model=ProcessingStatus)
async def get_processing_status(request_id: str):
    """Get the current status of an audio processing request"""
    if request_id not in active_requests:
        raise HTTPException(status_code=404, detail="Request not found")
    
    request_info = active_requests[request_id]
    
    return ProcessingStatus(
        request_id=request_id,
        status=request_info["status"],
        message=f"Request {request_info['status']}",
        progress=None,
        result=None,
        timestamp=request_info["submitted_at"].isoformat()
    )

@app.get("/api/audio/requests")
async def list_requests(
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100
):
    """List all audio processing requests with optional filtering"""
    filtered_requests = []
    
    for req_id, req_info in active_requests.items():
        if client_id and req_info["client_id"] != client_id:
            continue
        if status and req_info["status"] != status:
            continue
        
        filtered_requests.append({
            "request_id": req_id,
            "status": req_info["status"],
            "client_id": req_info["client_id"],
            "submitted_at": req_info["submitted_at"].isoformat(),
            "file_path": req_info["file_path"]
        })
    
    # Sort by submission time (newest first)
    filtered_requests.sort(key=lambda x: x["submitted_at"], reverse=True)
    
    return {
        "requests": filtered_requests[:limit],
        "total": len(filtered_requests),
        "limit": limit
    }

@app.get("/api/audio/download/{request_id}")
async def download_processed_audio(request_id: str):
    """Download the processed audio file"""
    if request_id not in active_requests:
        raise HTTPException(status_code=404, detail="Request not found")
    
    request_info = active_requests[request_id]
    
    if request_info["status"] != "completed":
        raise HTTPException(status_code=400, detail="Audio processing not completed")
    
    # Look for processed file
    original_file = Path(request_info["file_path"])
    processed_files = list(original_file.parent.glob(f"{original_file.stem}_*"))
    
    if not processed_files:
        raise HTTPException(status_code=404, detail="Processed file not found")
    
    # Return the most recent processed file
    latest_file = max(processed_files, key=lambda x: x.stat().st_mtime)
    
    return FileResponse(
        path=latest_file,
        filename=latest_file.name,
        media_type="audio/wav"
    )

@app.delete("/api/audio/requests/{request_id}")
async def cancel_request(request_id: str):
    """Cancel a pending audio processing request"""
    if request_id not in active_requests:
        raise HTTPException(status_code=404, detail="Request not found")
    
    request_info = active_requests[request_id]
    
    if request_info["status"] in ["completed", "failed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot cancel completed/failed request")
    
    # Update status
    request_info["status"] = "cancelled"
    
    # Clean up file
    if os.path.exists(request_info["file_path"]):
        os.remove(request_info["file_path"])
    
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
            "description": "Convert audio to different format",
            "parameters": {
                "target_format": {"type": "string", "description": "Target audio format", "default": "mp3"},
                "quality": {"type": "string", "description": "Audio quality", "default": "high", "options": ["low", "medium", "high"]}
            }
        }
    }
    
    return {
        "operations": operations,
        "total_operations": len(operations)
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    mcp_status = "connected" if mcp_client.connected else "disconnected"
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "mcp_server": mcp_status,
        "active_requests": len(active_requests)
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
            print(f"Error monitoring MCP status: {e}")
            await asyncio.sleep(60)  # Wait longer on error

# Start monitoring task
@app.on_event("startup")
async def start_monitoring():
    asyncio.create_task(monitor_mcp_status())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8002)
