import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_group, get_current_user, require_group_editor
from app.models.group import Group
from app.models.label import Label, TransactionLabel
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.common import TransactionCreate, TransactionResponse, TransactionUpdate

router = APIRouter(prefix="/transactions", tags=["transactions"])


async def load_transaction(db: AsyncSession, txn_id: str, group_id: str) -> Transaction:
    result = await db.execute(
        select(Transaction)
        .options(
            selectinload(Transaction.transaction_labels).selectinload(TransactionLabel.label),
            selectinload(Transaction.attachments),
            selectinload(Transaction.category),
            selectinload(Transaction.account),
        )
        .where(Transaction.id == txn_id, Transaction.group_id == group_id, Transaction.deleted_at.is_(None))
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return txn


def serialize(txn: Transaction) -> TransactionResponse:
    from app.schemas.common import AttachmentResponse, CategoryResponse, LabelResponse

    labels = []
    for tl in txn.transaction_labels:
        if tl.label:
            labels.append(LabelResponse(
                id=tl.label.id, client_id=tl.label.client_id, name=tl.label.name,
                created_at=tl.label.created_at, updated_at=tl.label.updated_at, deleted_at=tl.label.deleted_at,
            ))

    cat = None
    if txn.category:
        cat = CategoryResponse(
            id=txn.category.id, client_id=txn.category.client_id, name=txn.category.name,
            type=txn.category.type, color=txn.category.color, icon_type=txn.category.icon_type,
            icon_key=txn.category.icon_key, icon_storage_key=txn.category.icon_storage_key,
            sort_order=txn.category.sort_order, created_at=txn.category.created_at,
            updated_at=txn.category.updated_at, deleted_at=txn.category.deleted_at,
        )

    return TransactionResponse(
        id=txn.id,
        client_id=txn.client_id,
        account_id=txn.account_id,
        category_id=txn.category_id,
        type=txn.type,
        amount=float(txn.amount),
        date=txn.date,
        comment=txn.comment,
        label_ids=[tl.label_id for tl in txn.transaction_labels],
        labels=labels,
        attachments=[AttachmentResponse(
            id=a.id, client_id=a.client_id, storage_key=a.storage_key,
            thumbnail_key=a.thumbnail_key, mime_type=a.mime_type, upload_status=a.upload_status,
        ) for a in txn.attachments],
        category=cat,
        account=None,
        created_at=txn.created_at,
        updated_at=txn.updated_at,
        deleted_at=txn.deleted_at,
    )


async def set_labels(db: AsyncSession, txn: Transaction, label_ids: list[str]):
    await db.execute(delete(TransactionLabel).where(TransactionLabel.transaction_id == txn.id))
    for lid in label_ids:
        label = await db.get(Label, lid)
        if label and label.group_id == txn.group_id:
            db.add(TransactionLabel(transaction_id=txn.id, label_id=lid))


@router.get("", response_model=list[TransactionResponse])
async def list_transactions(
    type: str | None = None,
    account_id: str | None = None,
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(Transaction)
        .options(
            selectinload(Transaction.transaction_labels).selectinload(TransactionLabel.label),
            selectinload(Transaction.attachments),
            selectinload(Transaction.category),
            selectinload(Transaction.account),
        )
        .where(Transaction.group_id == group.id, Transaction.deleted_at.is_(None))
    )
    if type:
        q = q.where(Transaction.type == type)
    if account_id:
        q = q.where(Transaction.account_id == account_id)
    if from_date:
        q = q.where(Transaction.date >= from_date)
    if to_date:
        q = q.where(Transaction.date <= to_date)
    result = await db.execute(q.order_by(Transaction.date.desc(), Transaction.created_at.desc()))
    return [serialize(t) for t in result.scalars().all()]


@router.post("", response_model=TransactionResponse)
async def create_transaction(body: TransactionCreate, group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    txn = Transaction(
        id=str(uuid.uuid4()),
        client_id=body.client_id or str(uuid.uuid4()),
        user_id=user.id,
        group_id=group.id,
        account_id=body.account_id,
        category_id=body.category_id,
        type=body.type,
        amount=body.amount,
        date=body.date,
        comment=body.comment,
    )
    db.add(txn)
    await db.flush()
    await set_labels(db, txn, body.label_ids)
    await db.commit()
    return serialize(await load_transaction(db, txn.id, group.id))


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(transaction_id: str, group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return serialize(await load_transaction(db, transaction_id, group.id))


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(transaction_id: str, body: TransactionUpdate, group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    txn = await load_transaction(db, transaction_id, group.id)
    data = body.model_dump(exclude_unset=True)
    label_ids = data.pop("label_ids", None)
    for field, value in data.items():
        setattr(txn, field, value)
    if label_ids is not None:
        await set_labels(db, txn, label_ids)
    await db.commit()
    return serialize(await load_transaction(db, txn.id, group.id))


@router.delete("/{transaction_id}")
async def delete_transaction(transaction_id: str, group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    txn = await load_transaction(db, transaction_id, group.id)
    txn.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}
