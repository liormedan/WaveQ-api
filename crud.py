import json
from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from models import APIRequest


def _dump(value):
    return json.dumps(value) if value is not None else None


def create_request(
    db: Session,
    request_id: str,
    status: str = "submitted",
    file_path: Optional[str] = None,
    payload: Optional[dict] = None,
    client_id: Optional[str] = None,
):
    req = APIRequest(
        request_id=request_id,
        status=status,
        file_path=file_path,
        payload=_dump(payload),
        client_id=client_id,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


def update_request_status(db: Session, request_id: str, **fields):
    stmt = select(APIRequest).filter_by(request_id=request_id)
    req = db.execute(stmt).scalar_one_or_none()
    if not req:
        return None
    for key, value in fields.items():
        if value is None or not hasattr(req, key):
            continue
        if key in {"payload", "result"}:
            setattr(req, key, _dump(value))
        else:
            setattr(req, key, value)
    db.commit()
    db.refresh(req)
    return req


def get_request(db: Session, request_id: str) -> Optional[APIRequest]:
    stmt = select(APIRequest).filter_by(request_id=request_id)
    return db.execute(stmt).scalar_one_or_none()


def list_requests(
    db: Session,
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
):
    stmt = select(APIRequest)
    if client_id:
        stmt = stmt.filter_by(client_id=client_id)
    if status:
        stmt = stmt.filter_by(status=status)
    stmt = stmt.order_by(APIRequest.submitted_at.desc()).limit(limit)
    return list(db.scalars(stmt))

