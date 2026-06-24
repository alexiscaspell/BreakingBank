import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_group, get_current_user, require_group_editor
from app.models.group import Group
from app.models.label import Label
from app.models.user import User
from app.schemas.common import LabelCreate, LabelResponse

router = APIRouter(prefix="/labels", tags=["labels"])


@router.get("", response_model=list[LabelResponse])
async def list_labels(group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Label).where(Label.group_id == group.id, Label.deleted_at.is_(None)).order_by(Label.name))
    return result.scalars().all()


@router.post("", response_model=LabelResponse)
async def create_label(body: LabelCreate, group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    label = Label(id=str(uuid.uuid4()), client_id=body.client_id or str(uuid.uuid4()), user_id=user.id,
        group_id=group.id, name=body.name)
    db.add(label)
    await db.commit()
    await db.refresh(label)
    return label


@router.delete("/{label_id}")
async def delete_label(label_id: str, group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    label = await db.get(Label, label_id)
    if not label or label.group_id != group.id:
        raise HTTPException(status_code=404, detail="Label not found")
    label.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}
