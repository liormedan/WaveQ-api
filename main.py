from fastapi import FastAPI, Request, Form, HTTPException, BackgroundTasks
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi import status
import uvicorn
from pathlib import Path
from datetime import datetime, timedelta
import json
from typing import List, Optional
import uuid

app = FastAPI(title="WaveQ Audio API Manager", version="1.0.0")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

# In-memory storage for API requests (in production, use database)
api_requests = []
request_counter = 0

class AudioEditRequest:
    def __init__(self, request_id: str, client_name: str, audio_file: str, 
                 edit_type: str, description: str, priority: str = "normal"):
        self.request_id = request_id
        self.client_name = client_name
        self.audio_file = audio_file
        self.edit_type = edit_type
        self.description = description
        self.priority = priority
        self.status = "pending"
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.processing_time = None
        self.result_file = None
        self.error_message = None

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})

@app.get("/requests", response_class=HTMLResponse)
async def requests_page(request: Request):
    return templates.TemplateResponse("requests.html", {"request": request})

@app.get("/admin", response_class=HTMLResponse)
async def admin_dashboard(request: Request):
    return templates.TemplateResponse("admin.html", {"request": request})

@app.get("/clients", response_class=HTMLResponse)
async def clients_page(request: Request):
    return templates.TemplateResponse("clients.html", {"request": request})

@app.get("/requests", response_class=HTMLResponse)
async def requests_page(request: Request):
    return templates.TemplateResponse("requests.html", {"request": request})

@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    return templates.TemplateResponse("settings.html", {"request": request})

@app.get("/analytics", response_class=HTMLResponse)
async def analytics_page(request: Request):
    return templates.TemplateResponse("analytics.html", {"request": request})

# API endpoint for n8n to submit audio editing requests
@app.post("/api/audio-edit")
async def submit_audio_edit_request(
    client_name: str = Form(...),
    audio_file: str = Form(...),
    edit_type: str = Form(...),
    description: str = Form(...),
    priority: str = Form("normal")
):
    global request_counter
    request_counter += 1
    
    request_id = f"REQ-{request_counter:06d}"
    new_request = AudioEditRequest(
        request_id=request_id,
        client_name=client_name,
        audio_file=audio_file,
        edit_type=edit_type,
        description=description,
        priority=priority
    )
    
    api_requests.append(new_request)
    
    return {
        "success": True,
        "request_id": request_id,
        "message": "Audio edit request submitted successfully",
        "status": "pending"
    }

# Get all API requests
@app.get("/api/requests")
async def get_all_requests():
    requests_data = []
    for req in api_requests:
        requests_data.append({
            "request_id": req.request_id,
            "client_name": req.client_name,
            "audio_file": req.audio_file,
            "edit_type": req.edit_type,
            "description": req.description,
            "priority": req.priority,
            "status": req.status,
            "created_at": req.created_at.isoformat(),
            "updated_at": req.updated_at.isoformat(),
            "processing_time": req.processing_time,
            "result_file": req.result_file,
            "error_message": req.error_message
        })
    
    return {"requests": requests_data, "total": len(requests_data)}

# Update request status
@app.put("/api/requests/{request_id}/status")
async def update_request_status(
    request_id: str,
    status: str = Form(...),
    result_file: Optional[str] = Form(None),
    error_message: Optional[str] = Form(None)
):
    for req in api_requests:
        if req.request_id == request_id:
            req.status = status
            req.updated_at = datetime.now()
            if result_file:
                req.result_file = result_file
            if error_message:
                req.error_message = error_message
            
            if status == "completed":
                req.processing_time = (req.updated_at - req.created_at).total_seconds()
            
            return {"success": True, "message": f"Request {request_id} status updated to {status}"}
    
    raise HTTPException(status_code=404, detail="Request not found")

# Get request statistics
@app.get("/api/stats")
async def get_stats():
    total_requests = len(api_requests)
    pending_requests = len([r for r in api_requests if r.status == "pending"])
    completed_requests = len([r for r in api_requests if r.status == "completed"])
    failed_requests = len([r for r in api_requests if r.status == "failed"])
    
    # Calculate average processing time
    completed_with_time = [r for r in api_requests if r.processing_time]
    avg_processing_time = sum(r.processing_time for r in completed_with_time) / len(completed_with_time) if completed_with_time else 0
    
    return {
        "total_requests": total_requests,
        "pending_requests": pending_requests,
        "completed_requests": completed_requests,
        "failed_requests": failed_requests,
        "avg_processing_time": round(avg_processing_time, 2),
        "success_rate": round((completed_requests / total_requests * 100) if total_requests > 0 else 0, 1)
    }

# Background task to simulate audio processing
async def process_audio_request(request_id: str):
    # Simulate processing time
    import asyncio
    await asyncio.sleep(5)  # Simulate 5 seconds processing
    
    # Update status to completed
    for req in api_requests:
        if req.request_id == request_id:
            req.status = "completed"
            req.updated_at = datetime.now()
            req.processing_time = (req.updated_at - req.created_at).total_seconds()
            req.result_file = f"processed_{req.audio_file}"
            break

# Process request (simulate audio editing)
@app.post("/api/requests/{request_id}/process")
async def process_request(request_id: str, background_tasks: BackgroundTasks):
    for req in api_requests:
        if req.request_id == request_id and req.status == "pending":
            req.status = "processing"
            req.updated_at = datetime.now()
            
            # Add background task to simulate processing
            background_tasks.add_task(process_audio_request, request_id)
            
            return {"success": True, "message": f"Request {request_id} started processing"}
    
    raise HTTPException(status_code=404, detail="Request not found or not pending")

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)
