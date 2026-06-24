import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_group, get_current_user, require_group_editor
from app.models.group import Group
from app.models.reminder import Reminder
from app.models.user import User
from app.schemas.common import ReminderCreate, ReminderResponse, ReminderUpdate

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.get("", response_model=list[ReminderResponse])
async def list_reminders(group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Reminder).where(Reminder.group_id == group.id, Reminder.deleted_at.is_(None)))
    return result.scalars().all()


@router.post("", response_model=ReminderResponse)
async def create_reminder(body: ReminderCreate, group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    r = Reminder(
        id=str(uuid.uuid4()),
        client_id=body.client_id or str(uuid.uuid4()),
        user_id=user.id,
        group_id=group.id,
        **body.model_dump(exclude={"client_id"}),
    )
    db.add(r)
    await db.commit()
    await db.refresh(r)
    return r


@router.put("/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(reminder_id: str, body: ReminderUpdate, group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    r = await db.get(Reminder, reminder_id)
    if not r or r.group_id != group.id or r.deleted_at:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(r, field, value)
    await db.commit()
    await db.refresh(r)
    return r


@router.delete("/{reminder_id}")
async def delete_reminder(reminder_id: str, group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    r = await db.get(Reminder, reminder_id)
    if not r or r.group_id != group.id:
        raise HTTPException(status_code=404, detail="Not found")
    r.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}
