import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_group, get_current_user, require_group_editor
from app.models.group import Group
from app.models.account import Account
from app.models.user import User
from app.schemas.common import AccountCreate, AccountResponse, AccountUpdate
from app.services.analytics import account_balance

router = APIRouter(prefix="/accounts", tags=["accounts"])


def to_response(account: Account, balance: float) -> AccountResponse:
    return AccountResponse(
        id=account.id,
        client_id=account.client_id,
        name=account.name,
        icon_key=account.icon_key,
        color=account.color,
        initial_balance=float(account.initial_balance or 0),
        balance=balance,
        created_at=account.created_at,
        updated_at=account.updated_at,
        deleted_at=account.deleted_at,
    )


@router.get("", response_model=list[AccountResponse])
async def list_accounts(group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Account).where(Account.group_id == group.id, Account.deleted_at.is_(None)).order_by(Account.name)
    )
    accounts = result.scalars().all()
    out = []
    for acc in accounts:
        out.append(to_response(acc, await account_balance(db, acc)))
    return out


@router.post("", response_model=AccountResponse)
async def create_account(body: AccountCreate, group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    acc = Account(
        id=str(uuid.uuid4()),
        client_id=body.client_id or str(uuid.uuid4()),
        user_id=user.id,
        group_id=group.id,
        name=body.name,
        icon_key=body.icon_key,
        color=body.color,
        initial_balance=body.initial_balance,
    )
    db.add(acc)
    await db.commit()
    await db.refresh(acc)
    return to_response(acc, await account_balance(db, acc))


@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(account_id: str, body: AccountUpdate, group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    acc = await db.get(Account, account_id)
    if not acc or acc.group_id != group.id or acc.deleted_at:
        raise HTTPException(status_code=404, detail="Account not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(acc, field, value)
    await db.commit()
    await db.refresh(acc)
    return to_response(acc, await account_balance(db, acc))


@router.delete("/{account_id}")
async def delete_account(account_id: str, group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    acc = await db.get(Account, account_id)
    if not acc or acc.group_id != group.id:
        raise HTTPException(status_code=404, detail="Account not found")
    acc.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}
