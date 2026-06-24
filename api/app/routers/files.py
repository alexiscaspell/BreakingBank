import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_group, get_current_user
from app.models.attachment import Attachment
from app.models.group import Group
from app.models.transaction import Transaction
from app.models.user import User
from app.services.storage import storage_service

router = APIRouter(prefix="/files", tags=["files"])


@router.post("/icons")
async def upload_icon(
    file: UploadFile = File(...),
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
):
    raw = await file.read()
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")
    key = storage_service.process_icon(group.id, raw)
    return {"storage_key": key}


@router.post("/attachments/{transaction_id}")
async def upload_attachment(
    transaction_id: str,
    file: UploadFile = File(...),
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    txn = await db.get(Transaction, transaction_id)
    if not txn or txn.group_id != group.id:
        raise HTTPException(status_code=404, detail="Transaction not found")
    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")
    key, tkey = storage_service.process_attachment(group.id, transaction_id, raw, file.filename or "photo.jpg")
    att = Attachment(
        id=str(uuid.uuid4()),
        client_id=str(uuid.uuid4()),
        transaction_id=transaction_id,
        storage_key=key,
        thumbnail_key=tkey,
        mime_type=file.content_type or "image/webp",
        size_bytes=len(raw),
        original_filename=file.filename,
        upload_status="uploaded",
    )
    db.add(att)
    await db.commit()
    await db.refresh(att)
    return att


@router.get("/{storage_key:path}/url")
async def get_file_url(
    storage_key: str,
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
):
    if not storage_key.startswith(f"icons/{group.id}/") and f"/{group.id}/" not in storage_key:
        raise HTTPException(status_code=403, detail="Forbidden")
    return {"url": storage_service.presigned_url(storage_key)}
