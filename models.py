from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Float
from database import Base


class APIRequest(Base):
    __tablename__ = "api_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String, unique=True, index=True)
    status = Column(String, default="submitted")
    file_path = Column(String, nullable=True)
    payload = Column(String, nullable=True)
    client_id = Column(String, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    progress = Column(Float, nullable=True)
    result = Column(String, nullable=True)

class AudioEditRequest(Base):
    __tablename__ = "audio_edit_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String, unique=True, index=True)
    client_name = Column(String, nullable=False)
    audio_file = Column(String, nullable=False)
    edit_type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    priority = Column(String, default="normal")
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    processing_time = Column(Float, nullable=True)
    result_file = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
