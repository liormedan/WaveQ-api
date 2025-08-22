"""
🎵 WaveQ Audio Agent API

This module provides API endpoints that use the Audio Agent Library
to process natural language audio requests.
"""

from fastapi import FastAPI, HTTPException, Depends, Header, status, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import asyncio
import json
import os
import uuid
from datetime import datetime
import logging

# Import our Audio Agent and exposed operations
from audio_agent_library import AudioAgent, V1_OPERATIONS
from gemini_audio_integration import GeminiAudioIntegration

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
from dotenv import load_dotenv
load_dotenv("config.env", override=True)

# Security configuration
API_KEY_REQUIRED = os.getenv("API_KEY_REQUIRED", "false").lower() == "true"
API_KEY_HEADER = os.getenv("API_KEY_HEADER", "X-API-Key")
API_KEY = os.getenv("API_KEY", "")

async def verify_api_key(api_key: str = Header(None, alias=API_KEY_HEADER)):
    """Verify API key if required"""
    if not API_KEY_REQUIRED:
        return
    if not api_key or api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )

# Create FastAPI app
app = FastAPI(
    title="WaveQ Audio Agent API",
    description="Intelligent Audio Processing API with Natural Language Understanding",
    version="1.0.0",
    dependencies=[Depends(verify_api_key)],
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8001", "http://localhost:8002"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Request models
class NaturalLanguageRequest(BaseModel):
    """Natural language audio processing request"""
    message: str
    audio_file: Optional[str] = None
    priority: Optional[str] = "normal"
    description: Optional[str] = ""

class AudioProcessingResponse(BaseModel):
    """Response for audio processing request"""
    request_id: str
    status: str
    message: str
    operations: List[Dict[str, Any]]
    confidence: float
    gemini_insights: Optional[Dict[str, Any]] = None
    timestamp: str

class ConversationHistoryResponse(BaseModel):
    """Response for conversation history"""
    total_messages: int
    user_messages: int
    assistant_messages: int
    conversation_duration: str
    last_message: Optional[Dict[str, Any]] = None

# Initialize Audio Agent and Gemini Integration
audio_agent = AudioAgent()
gemini_integration = GeminiAudioIntegration()

# Request tracking
active_requests = {}

@app.post("/api/audio/process-natural", response_model=AudioProcessingResponse)
async def process_natural_language_audio(
    request: NaturalLanguageRequest
):
    """
    Process natural language audio request using Audio Agent
    
    This endpoint understands natural language requests like:
    - "cut from 30 seconds to 2 minutes"
    - "normalize to -20 dB and add fade in"
    - "remove noise and boost bass"
    """
    try:
        logger.info(f"Processing natural language request: {request.message}")
        
        # Process request through Gemini integration
        result = await gemini_integration.process_audio_request(
            request.message, 
            request.audio_file
        )
        
        # Store request
        request_id = result["request_id"]
        active_requests[request_id] = {
            "status": "processed",
            "request": request.dict(),
            "result": result,
            "timestamp": datetime.now().isoformat()
        }
        
        # Return response
        return AudioProcessingResponse(
            request_id=request_id,
            status="processed",
            message="Audio request processed successfully",
            operations=result["operations"],
            confidence=result["conversation_context"]["parsed_confidence"],
            gemini_insights=result.get("gemini_insights"),
            timestamp=result["timestamp"]
        )

    except ValueError as e:
        logger.warning(f"Unsupported operations requested: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error processing natural language request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing request: {str(e)}"
        )

@app.post("/api/audio/process-upload", response_model=AudioProcessingResponse)
async def process_audio_upload(
    audio_file: UploadFile = File(...),
    message: str = Form(...),
    priority: str = Form("normal"),
    description: str = Form("")
):
    """
    Process audio file with natural language instructions
    
    Upload an audio file and provide natural language instructions
    for processing.
    """
    try:
        # Save uploaded file
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_id = str(uuid.uuid4())
        file_extension = audio_file.filename.split(".")[-1] if "." in audio_file.filename else "wav"
        file_path = os.path.join(upload_dir, f"{file_id}.{file_extension}")
        
        with open(file_path, "wb") as buffer:
            content = await audio_file.read()
            buffer.write(content)
        
        logger.info(f"Audio file uploaded: {file_path}")
        
        # Process with Audio Agent
        result = await gemini_integration.process_audio_request(
            message, 
            file_path
        )
        
        # Store request
        request_id = result["request_id"]
        active_requests[request_id] = {
            "status": "uploaded",
            "file_path": file_path,
            "request": {
                "message": message,
                "priority": priority,
                "description": description
            },
            "result": result,
            "timestamp": datetime.now().isoformat()
        }
        
        # Return response
        return AudioProcessingResponse(
            request_id=request_id,
            status="uploaded",
            message="Audio file uploaded and processed successfully",
            operations=result["operations"],
            confidence=result["conversation_context"]["parsed_confidence"],
            gemini_insights=result.get("gemini_insights"),
            timestamp=result["timestamp"]
        )

    except ValueError as e:
        logger.warning(f"Unsupported operations requested: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error processing audio upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing upload: {str(e)}"
        )

@app.get("/api/audio/operations", response_model=Dict[str, Any])
async def get_supported_operations():
    """Get list of supported audio operations with examples"""
    try:
        return {
            "operations": V1_OPERATIONS,
            "total_operations": len(V1_OPERATIONS),
            "agent_version": "1.0.0",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting supported operations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting operations: {str(e)}"
        )

@app.get("/api/audio/help", response_model=Dict[str, str])
async def get_help_text():
    """Get help text for supported operations"""
    try:
        help_text = "🎵 WaveQ Audio Agent - Supported Operations:\n\n"
        for operation, info in V1_OPERATIONS.items():
            help_text += f"🔧 {operation.upper()}\n"
            help_text += f"   Description: {info['description']}\n"
            help_text += f"   Aliases: {', '.join(info['aliases'])}\n"
            help_text += f"   Examples:\n"
            for example in info['examples']:
                help_text += f"     • {example}\n"
            help_text += "\n"
        return {
            "help_text": help_text,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting help text: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting help: {str(e)}"
        )

@app.get("/api/audio/conversation/summary", response_model=ConversationHistoryResponse)
async def get_conversation_summary():
    """Get conversation history summary"""
    try:
        summary = gemini_integration.get_conversation_summary()
        return ConversationHistoryResponse(**summary)
    except Exception as e:
        logger.error(f"Error getting conversation summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting summary: {str(e)}"
        )

@app.post("/api/audio/conversation/clear")
async def clear_conversation_history():
    """Clear conversation history"""
    try:
        gemini_integration.clear_conversation_history()
        return {"message": "Conversation history cleared successfully"}
    except Exception as e:
        logger.error(f"Error clearing conversation history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error clearing history: {str(e)}"
        )

@app.get("/api/audio/requests/{request_id}")
async def get_request_status(request_id: str):
    """Get status of a specific request"""
    try:
        if request_id not in active_requests:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found"
            )
        
        return active_requests[request_id]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting request status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting status: {str(e)}"
        )

@app.get("/api/audio/requests")
async def list_all_requests():
    """List all active requests"""
    try:
        return {
            "requests": list(active_requests.keys()),
            "total_requests": len(active_requests),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error listing requests: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing requests: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "WaveQ Audio Agent API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "audio_agent": "active",
        "gemini_integration": "active"
    }

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "🎵 WaveQ Audio Agent API",
        "description": "Intelligent Audio Processing with Natural Language Understanding",
        "version": "1.0.0",
        "endpoints": {
            "process_natural": "/api/audio/process-natural",
            "process_upload": "/api/audio/process-upload",
            "operations": "/api/audio/operations",
            "help": "/api/audio/help",
            "conversation_summary": "/api/audio/conversation/summary",
            "health": "/health"
        },
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    
    # Use environment variables for configuration
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8003"))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    
    logger.info(f"Starting WaveQ Audio Agent API on {host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="info" if not debug else "debug")

