import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_group, get_current_user, require_group_editor
from app.models.group import Group
from app.models.transfer import Transfer
from app.models.user import User
from app.schemas.common import TransferCreate, TransferResponse

router = APIRouter(prefix="/transfers", tags=["transfers"])


@router.get("", response_model=list[TransferResponse])
async def list_transfers(group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Transfer).where(Transfer.group_id == group.id, Transfer.deleted_at.is_(None)).order_by(Transfer.date.desc())
    )
    return result.scalars().all()


@router.post("", response_model=TransferResponse)
async def create_transfer(body: TransferCreate, group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if body.from_account_id == body.to_account_id:
        raise HTTPException(status_code=400, detail="Accounts must differ")
    t = Transfer(
        id=str(uuid.uuid4()),
        client_id=body.client_id or str(uuid.uuid4()),
        user_id=user.id,
        group_id=group.id,
        **body.model_dump(exclude={"client_id"}),
    )
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return t


@router.delete("/{transfer_id}")
async def delete_transfer(transfer_id: str, group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    t = await db.get(Transfer, transfer_id)
    if not t or t.group_id != group.id:
        raise HTTPException(status_code=404, detail="Transfer not found")
    t.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}
