from fastapi import FastAPI, Request, Form, HTTPException, BackgroundTasks, UploadFile, File, Depends
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi import status
import uvicorn
from pathlib import Path
from datetime import datetime, timedelta
import json
from typing import List, Optional
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import Base, engine, get_db, SessionLocal
from models import AudioEditRequest

app = FastAPI(title="WaveQ Audio API Manager", version="1.0.0")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

# Database initialization
Base.metadata.create_all(bind=engine)

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

# Chat routes
@app.get("/chat", response_class=HTMLResponse)
async def chat_page(request: Request):
    return templates.TemplateResponse("chat.html", {"request": request})

@app.post("/chat")
async def handle_chat(file: UploadFile = File(...), message: str = Form(...)):
    return {"filename": file.filename, "message": message}

# API endpoint for n8n to submit audio editing requests
@app.post("/api/audio-edit")
async def submit_audio_edit_request(
    client_name: str = Form(...),
    audio_file: str = Form(...),
    edit_type: str = Form(...),
    description: str = Form(...),
    priority: str = Form("normal"),
    db: Session = Depends(get_db)
):
    new_request = AudioEditRequest(
        client_name=client_name,
        audio_file=audio_file,
        edit_type=edit_type,
        description=description,
        priority=priority
    )
    db.add(new_request)
    db.flush()
    new_request.request_id = f"REQ-{new_request.id:06d}"
    db.commit()
    db.refresh(new_request)

    return {
        "success": True,
        "request_id": new_request.request_id,
        "message": "Audio edit request submitted successfully",
        "status": "pending"
    }

# Get all API requests
@app.get("/api/requests")
async def get_all_requests(db: Session = Depends(get_db)):
    requests = db.query(AudioEditRequest).all()
    requests_data = []
    for req in requests:
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

# Get request status
@app.get("/api/requests/{request_id}/status")
async def get_request_status(request_id: str, db: Session = Depends(get_db)):
    req = db.query(AudioEditRequest).filter(AudioEditRequest.request_id == request_id).first()
    if req:
        return {
            "request_id": req.request_id,
            "status": req.status,
            "result_file": req.result_file,
        }
    raise HTTPException(status_code=404, detail="Request not found")

# Download processed file
@app.get("/api/requests/{request_id}/download")
async def download_processed_file(request_id: str, db: Session = Depends(get_db)):
    req = db.query(AudioEditRequest).filter(AudioEditRequest.request_id == request_id).first()
    if req and req.result_file:
        file_path = Path(req.result_file)
        if file_path.exists():
            return FileResponse(file_path, filename=file_path.name)
        raise HTTPException(status_code=404, detail="File not found")
    raise HTTPException(status_code=404, detail="Request not found")

# Update request status
@app.put("/api/requests/{request_id}/status")
async def update_request_status(
    request_id: str,
    status: str = Form(...),
    result_file: Optional[str] = Form(None),
    error_message: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    req = db.query(AudioEditRequest).filter(AudioEditRequest.request_id == request_id).first()
    if req:
        req.status = status
        req.updated_at = datetime.now()
        if result_file:
            req.result_file = result_file
        if error_message:
            req.error_message = error_message

        if status == "completed":
            req.processing_time = (req.updated_at - req.created_at).total_seconds()
        db.commit()

        return {"success": True, "message": f"Request {request_id} status updated to {status}"}

    raise HTTPException(status_code=404, detail="Request not found")

# Get request statistics
@app.get("/api/stats")
async def get_stats(db: Session = Depends(get_db)):
    total_requests = db.query(func.count(AudioEditRequest.id)).scalar()
    pending_requests = (
        db.query(func.count(AudioEditRequest.id))
        .filter(AudioEditRequest.status == "pending")
        .scalar()
    )
    completed_requests = (
        db.query(func.count(AudioEditRequest.id))
        .filter(AudioEditRequest.status == "completed")
        .scalar()
    )
    failed_requests = (
        db.query(func.count(AudioEditRequest.id))
        .filter(AudioEditRequest.status == "failed")
        .scalar()
    )

    avg_processing_time = (
        db.query(func.avg(AudioEditRequest.processing_time))
        .filter(AudioEditRequest.processing_time != None)
        .scalar()
        or 0
    )

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
    db = SessionLocal()
    try:
        req = db.query(AudioEditRequest).filter(AudioEditRequest.request_id == request_id).first()
        if req:
            req.status = "completed"
            req.updated_at = datetime.now()
            req.processing_time = (req.updated_at - req.created_at).total_seconds()
            req.result_file = f"processed_{req.audio_file}"
            db.commit()
    finally:
        db.close()

# Process request (simulate audio editing)
@app.post("/api/requests/{request_id}/process")
async def process_request(request_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    req = db.query(AudioEditRequest).filter(AudioEditRequest.request_id == request_id).first()
    if req and req.status == "pending":
        req.status = "processing"
        req.updated_at = datetime.now()
        db.commit()

        # Add background task to simulate processing
        background_tasks.add_task(process_audio_request, request_id)

        return {"success": True, "message": f"Request {request_id} started processing"}

    raise HTTPException(status_code=404, detail="Request not found or not pending")

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)
