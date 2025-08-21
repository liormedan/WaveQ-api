from fastapi import FastAPI, Request, Form, HTTPException, BackgroundTasks, UploadFile, File, Depends, Response, Cookie
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, RedirectResponse
from fastapi import status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel, validator
import uvicorn
import os
import logging
import re
from pathlib import Path
from datetime import datetime, timedelta
import json
from typing import List, Optional
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import Base, engine, get_db, SessionLocal
from models import AudioEditRequest
from jose import JWTError, jwt
from passlib.context import CryptContext

app = FastAPI(title="WaveQ Audio API Manager", version="1.0.0")

# Security: Rate Limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security: CORS configuration
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,  # Security: disable credentials
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Security: Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('waveq_audio.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Security: Add security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    return response

# Security: Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.utcnow()
    
    # Log request
    logger.info(f"Request: {request.method} {request.url} from {request.client.host}")
    
    try:
        response = await call_next(request)
        process_time = (datetime.utcnow() - start_time).total_seconds()
        
        # Log response
        logger.info(f"Response: {response.status_code} in {process_time:.3f}s")
        
        # Add performance header
        response.headers["X-Process-Time"] = str(process_time)
        
        return response
    except Exception as e:
        process_time = (datetime.utcnow() - start_time).total_seconds()
        logger.error(f"Error processing request: {e} in {process_time:.3f}s")
        raise

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

# Authentication setup
SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "change_me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class User(BaseModel):
    username: str
    disabled: Optional[bool] = None

class UserInDB(User):
    hashed_password: str

fake_users_db = {
    "admin": {
        "username": "admin",
        "hashed_password": pwd_context.hash("admin"),
        "disabled": False,
    }
}

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_user(db, username: str):
    user_dict = db.get(username)
    if user_dict:
        return UserInDB(**user_dict)

def authenticate_user(db, username: str, password: str):
    user = get_user(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), token_cookie: str = Cookie(None)):
    if not token:
        token = token_cookie
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = get_user(fake_users_db, username)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


@app.exception_handler(HTTPException)
async def auth_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code == status.HTTP_401_UNAUTHORIZED:
        return templates.TemplateResponse("unauthorized.html", {"request": request}, status_code=exc.status_code)
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)

# Security: Input validation models
class AudioEditRequestModel(BaseModel):
    client_name: str
    audio_file: str
    edit_type: str
    description: str
    priority: str = "normal"
    
    @validator('client_name')
    def validate_client_name(cls, v):
        if not re.match(r'^[a-zA-Z0-9\s\-_]{1,50}$', v):
            raise ValueError('Client name must be alphanumeric with spaces, hyphens, and underscores only')
        return v.strip()
    
    @validator('audio_file')
    def validate_audio_file(cls, v):
        allowed_extensions = ['.wav', '.mp3', '.flac', '.aac', '.ogg']
        if not any(v.lower().endswith(ext) for ext in allowed_extensions):
            raise ValueError('Invalid audio file format')
        return v
    
    @validator('edit_type')
    def validate_edit_type(cls, v):
        allowed_types = ['trim', 'normalize', 'fade_in', 'fade_out', 'speed_change', 
                        'pitch_change', 'reverb', 'noise_reduction', 'equalize', 
                        'compress', 'merge', 'split', 'convert_format']
        if v not in allowed_types:
            raise ValueError('Invalid edit type')
        return v
    
    @validator('priority')
    def validate_priority(cls, v):
        if v not in ['low', 'normal', 'high', 'urgent']:
            raise ValueError('Invalid priority level')
        return v

# Database initialization
Base.metadata.create_all(bind=engine)

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})

@app.get("/requests", response_class=HTMLResponse)
async def requests_page(request: Request):
    return templates.TemplateResponse("requests.html", {"request": request})


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    access_token = create_access_token(data={"sub": user.username})
    response = RedirectResponse(url="/", status_code=303)
    response.set_cookie(key="access_token", value=access_token, httponly=True)
    return response


@app.get("/logout")
async def logout(response: Response):
    response = RedirectResponse(url="/login", status_code=303)
    response.delete_cookie("access_token")
    return response

@app.get("/admin", response_class=HTMLResponse)
async def admin_dashboard(request: Request, user: User = Depends(get_current_user)):
    return templates.TemplateResponse("admin.html", {"request": request, "user": user})

@app.get("/clients", response_class=HTMLResponse)
async def clients_page(request: Request, user: User = Depends(get_current_user)):
    return templates.TemplateResponse("clients.html", {"request": request, "user": user})

@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request, user: User = Depends(get_current_user)):
    return templates.TemplateResponse("settings.html", {"request": request, "user": user})

@app.get("/analytics", response_class=HTMLResponse)
async def analytics_page(request: Request, user: User = Depends(get_current_user)):
    return templates.TemplateResponse("analytics.html", {"request": request, "user": user})

# Chat routes
@app.get("/chat", response_class=HTMLResponse)
async def chat_page(request: Request, user: User = Depends(get_current_user)):
    return templates.TemplateResponse("chat.html", {"request": request, "user": user})

@app.post("/chat")
async def handle_chat(file: UploadFile = File(...), message: str = Form(...)):
    return {"filename": file.filename, "message": message}

# API endpoint for n8n to submit audio editing requests
@app.post("/api/audio-edit")
@limiter.limit("10/minute")  # Security: Rate limiting
async def submit_audio_edit_request(
    request: Request,  # Required for rate limiting
    client_name: str = Form(...),
    audio_file: str = Form(...),
    edit_type: str = Form(...),
    description: str = Form(...),
    priority: str = Form("normal"),
    db: Session = Depends(get_db)
):
    try:
        # Security: Input validation
        request_data = AudioEditRequestModel(
            client_name=client_name,
            audio_file=audio_file,
            edit_type=edit_type,
            description=description,
            priority=priority
        )
        
        # Security: Sanitize description
        sanitized_description = re.sub(r'<[^>]+>', '', description)  # Remove HTML tags
        sanitized_description = sanitized_description[:500]  # Limit length
        
        new_request = AudioEditRequest(
            client_name=request_data.client_name,
            audio_file=request_data.audio_file,
            edit_type=request_data.edit_type,
            description=sanitized_description,
            priority=request_data.priority
        )
        db.add(new_request)
        db.flush()
        new_request.request_id = f"REQ-{new_request.id:06d}"
        db.commit()
        db.refresh(new_request)

        # Security: Log the request
        logger.info(f"Audio edit request submitted: {new_request.request_id} by {request_data.client_name}")

        return {
            "success": True,
            "request_id": new_request.request_id,
            "message": "Audio edit request submitted successfully",
            "status": "pending"
        }
    except ValueError as e:
        logger.warning(f"Invalid input data: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing request: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Get all API requests
@app.get("/api/requests")
async def get_all_requests(db: Session = Depends(get_db)):
    try:
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

        logger.info(f"Retrieved {len(requests_data)} requests")
        return {"requests": requests_data, "total": len(requests_data)}
    except Exception as e:
        logger.error(f"Error retrieving requests: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving requests")

# Get request status
@app.get("/api/requests/{request_id}/status")
async def get_request_status(request_id: str, db: Session = Depends(get_db)):
    try:
        req = db.query(AudioEditRequest).filter(AudioEditRequest.request_id == request_id).first()
        if req:
            logger.info(f"Status request for: {request_id}")
            return {
                "request_id": req.request_id,
                "status": req.status,
                "result_file": req.result_file,
            }
        logger.warning(f"Status request not found: {request_id}")
        raise HTTPException(status_code=404, detail="Request not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting request status: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving request status")

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

# Security: Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "WaveQ Audio API Manager",
        "version": "1.0.0"
    }

# Security: Metrics endpoint for monitoring
@app.get("/metrics")
async def get_metrics():
    """Metrics endpoint for monitoring and observability"""
    try:
        # Get basic stats
        db = SessionLocal()
        total_requests = db.query(func.count(AudioEditRequest.id)).scalar()
        pending_requests = db.query(func.count(AudioEditRequest.id)).filter(AudioEditRequest.status == "pending").scalar()
        completed_requests = db.query(func.count(AudioEditRequest.id)).filter(AudioEditRequest.status == "completed").scalar()
        failed_requests = db.query(func.count(AudioEditRequest.id)).filter(AudioEditRequest.status == "failed").scalar()
        db.close()
        
        return {
            "total_requests": total_requests,
            "pending_requests": pending_requests,
            "completed_requests": completed_requests,
            "failed_requests": failed_requests,
            "success_rate": round((completed_requests / total_requests * 100) if total_requests > 0 else 0, 1),
            "timestamp": datetime.utcnow().isoformat(),
            "uptime": "active"  # Could be enhanced with actual uptime tracking
        }
    except Exception as e:
        logger.error(f"Error getting metrics: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving metrics")

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
    # Security: Use environment variable for host, default to 0.0.0.0 for production
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8001"))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    
    uvicorn.run(app, host=host, port=port, log_level="info" if not debug else "debug")
