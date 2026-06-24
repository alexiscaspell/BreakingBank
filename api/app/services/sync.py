import uuid
from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.account import Account
from app.models.category import Category
from app.models.label import Label, TransactionLabel
from app.models.recurring_payment import RecurringPayment
from app.models.reminder import Reminder
from app.models.transaction import Transaction
from app.models.transfer import Transfer
from app.schemas.common import (
    AccountCreate,
    AccountResponse,
    CategoryCreate,
    CategoryResponse,
    LabelCreate,
    LabelResponse,
    RecurringPaymentCreate,
    RecurringPaymentResponse,
    ReminderCreate,
    ReminderResponse,
    SyncMutation,
    SyncPullResponse,
    SyncPushResponse,
    TransactionCreate,
    TransactionResponse,
    TransferCreate,
    TransferResponse,
)
from app.services.analytics import account_balance


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _account_response(db: AsyncSession, acc: Account) -> AccountResponse:
    return AccountResponse(
        id=acc.id,
        client_id=acc.client_id,
        name=acc.name,
        icon_key=acc.icon_key,
        color=acc.color,
        initial_balance=float(acc.initial_balance or 0),
        balance=await account_balance(db, acc),
        created_at=acc.created_at,
        updated_at=acc.updated_at,
        deleted_at=acc.deleted_at,
    )


def _serialize_transaction(txn: Transaction) -> TransactionResponse:
    from app.schemas.common import AttachmentResponse

    labels = []
    for tl in txn.transaction_labels:
        if tl.label:
            labels.append(
                LabelResponse(
                    id=tl.label.id,
                    client_id=tl.label.client_id,
                    name=tl.label.name,
                    created_at=tl.label.created_at,
                    updated_at=tl.label.updated_at,
                    deleted_at=tl.label.deleted_at,
                )
            )

    cat = None
    if txn.category and not txn.category.deleted_at:
        cat = CategoryResponse(
            id=txn.category.id,
            client_id=txn.category.client_id,
            name=txn.category.name,
            type=txn.category.type,
            color=txn.category.color,
            icon_type=txn.category.icon_type,
            icon_key=txn.category.icon_key,
            icon_storage_key=txn.category.icon_storage_key,
            sort_order=txn.category.sort_order,
            created_at=txn.category.created_at,
            updated_at=txn.category.updated_at,
            deleted_at=txn.category.deleted_at,
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
        attachments=[
            AttachmentResponse(
                id=a.id,
                client_id=a.client_id,
                storage_key=a.storage_key,
                thumbnail_key=a.thumbnail_key,
                mime_type=a.mime_type,
                upload_status=a.upload_status,
            )
            for a in txn.attachments
        ],
        category=cat,
        account=None,
        created_at=txn.created_at,
        updated_at=txn.updated_at,
        deleted_at=txn.deleted_at,
    )


async def pull_changes(db: AsyncSession, group_id: str, since: datetime | None) -> SyncPullResponse:
    acc_q = select(Account).where(Account.group_id == group_id)
    if since:
        acc_q = acc_q.where(or_(Account.updated_at > since, Account.deleted_at > since))
    else:
        acc_q = acc_q.where(Account.deleted_at.is_(None))
    accounts = [await _account_response(db, a) for a in (await db.execute(acc_q)).scalars().all()]

    cat_q = select(Category).where(Category.group_id == group_id)
    if since:
        cat_q = cat_q.where(or_(Category.updated_at > since, Category.deleted_at > since))
    else:
        cat_q = cat_q.where(Category.deleted_at.is_(None))
    categories = list((await db.execute(cat_q)).scalars().all())

    lbl_q = select(Label).where(Label.group_id == group_id)
    if since:
        lbl_q = lbl_q.where(or_(Label.updated_at > since, Label.deleted_at > since))
    else:
        lbl_q = lbl_q.where(Label.deleted_at.is_(None))
    labels = list((await db.execute(lbl_q)).scalars().all())

    txn_q = (
        select(Transaction)
        .options(
            selectinload(Transaction.transaction_labels).selectinload(TransactionLabel.label),
            selectinload(Transaction.attachments),
            selectinload(Transaction.category),
        )
        .where(Transaction.group_id == group_id)
    )
    if since:
        txn_q = txn_q.where(or_(Transaction.updated_at > since, Transaction.deleted_at > since))
    else:
        txn_q = txn_q.where(Transaction.deleted_at.is_(None))
    transactions = [_serialize_transaction(t) for t in (await db.execute(txn_q)).scalars().all()]

    tr_q = select(Transfer).where(Transfer.group_id == group_id)
    if since:
        tr_q = tr_q.where(or_(Transfer.updated_at > since, Transfer.deleted_at > since))
    else:
        tr_q = tr_q.where(Transfer.deleted_at.is_(None))
    transfers = [TransferResponse.model_validate(t) for t in (await db.execute(tr_q)).scalars().all()]

    rec_q = select(RecurringPayment).where(RecurringPayment.group_id == group_id)
    if since:
        rec_q = rec_q.where(or_(RecurringPayment.updated_at > since, RecurringPayment.deleted_at > since))
    else:
        rec_q = rec_q.where(RecurringPayment.deleted_at.is_(None))
    recurring = [RecurringPaymentResponse.model_validate(r) for r in (await db.execute(rec_q)).scalars().all()]

    rem_q = select(Reminder).where(Reminder.group_id == group_id)
    if since:
        rem_q = rem_q.where(or_(Reminder.updated_at > since, Reminder.deleted_at > since))
    else:
        rem_q = rem_q.where(Reminder.deleted_at.is_(None))
    reminders = [ReminderResponse.model_validate(r) for r in (await db.execute(rem_q)).scalars().all()]

    return SyncPullResponse(
        accounts=accounts,
        categories=categories,
        labels=labels,
        transactions=transactions,
        transfers=transfers,
        recurring=recurring,
        reminders=reminders,
        server_time=_utcnow(),
    )


async def _upsert_account(db: AsyncSession, group_id: str, user_id: str, data: AccountCreate) -> Account:
    cid = data.client_id or str(uuid.uuid4())
    result = await db.execute(select(Account).where(Account.client_id == cid, Account.group_id == group_id))
    acc = result.scalar_one_or_none()
    if acc:
        acc.name = data.name
        acc.icon_key = data.icon_key
        acc.color = data.color
        acc.initial_balance = data.initial_balance
        acc.updated_at = _utcnow()
        acc.deleted_at = None
    else:
        acc = Account(
            id=str(uuid.uuid4()),
            client_id=cid,
            user_id=user_id,
            group_id=group_id,
            name=data.name,
            icon_key=data.icon_key,
            color=data.color,
            initial_balance=data.initial_balance,
        )
        db.add(acc)
    await db.flush()
    return acc


async def _upsert_category(db: AsyncSession, group_id: str, user_id: str, data: CategoryCreate) -> Category:
    cid = data.client_id or str(uuid.uuid4())
    result = await db.execute(select(Category).where(Category.client_id == cid, Category.group_id == group_id))
    cat = result.scalar_one_or_none()
    if cat:
        for field in ("name", "type", "color", "icon_type", "icon_key", "icon_storage_key", "sort_order"):
            setattr(cat, field, getattr(data, field))
        cat.updated_at = _utcnow()
        cat.deleted_at = None
    else:
        cat = Category(id=str(uuid.uuid4()), client_id=cid, user_id=user_id, group_id=group_id, **data.model_dump(exclude={"client_id"}))
        db.add(cat)
    await db.flush()
    return cat


async def _upsert_label(db: AsyncSession, group_id: str, user_id: str, data: LabelCreate) -> Label:
    cid = data.client_id or str(uuid.uuid4())
    result = await db.execute(select(Label).where(Label.client_id == cid, Label.group_id == group_id))
    label = result.scalar_one_or_none()
    if label:
        label.name = data.name
        label.updated_at = _utcnow()
        label.deleted_at = None
    else:
        label = Label(id=str(uuid.uuid4()), client_id=cid, user_id=user_id, group_id=group_id, name=data.name)
        db.add(label)
    await db.flush()
    return label


async def _set_txn_labels(db: AsyncSession, txn: Transaction, label_ids: list[str]):
    from sqlalchemy import delete

    await db.execute(delete(TransactionLabel).where(TransactionLabel.transaction_id == txn.id))
    for lid in label_ids:
        label = await db.get(Label, lid)
        if label and label.group_id == txn.group_id:
            db.add(TransactionLabel(transaction_id=txn.id, label_id=lid))


async def _upsert_transaction(db: AsyncSession, group_id: str, user_id: str, data: TransactionCreate) -> Transaction:
    cid = data.client_id or str(uuid.uuid4())
    result = await db.execute(select(Transaction).where(Transaction.client_id == cid, Transaction.group_id == group_id))
    txn = result.scalar_one_or_none()
    if txn:
        txn.account_id = data.account_id
        txn.category_id = data.category_id
        txn.type = data.type
        txn.amount = data.amount
        txn.date = data.date
        txn.comment = data.comment
        txn.updated_at = _utcnow()
        txn.deleted_at = None
    else:
        txn = Transaction(
            id=str(uuid.uuid4()),
            client_id=cid,
            user_id=user_id,
            group_id=group_id,
            account_id=data.account_id,
            category_id=data.category_id,
            type=data.type,
            amount=data.amount,
            date=data.date,
            comment=data.comment,
        )
        db.add(txn)
        await db.flush()
    await _set_txn_labels(db, txn, data.label_ids)
    await db.flush()
    return txn


async def _upsert_transfer(db: AsyncSession, group_id: str, user_id: str, data: TransferCreate) -> Transfer:
    cid = data.client_id or str(uuid.uuid4())
    result = await db.execute(select(Transfer).where(Transfer.client_id == cid, Transfer.group_id == group_id))
    row = result.scalar_one_or_none()
    if row:
        row.from_account_id = data.from_account_id
        row.to_account_id = data.to_account_id
        row.amount = data.amount
        row.date = data.date
        row.comment = data.comment
        row.updated_at = _utcnow()
        row.deleted_at = None
    else:
        row = Transfer(
            id=str(uuid.uuid4()),
            client_id=cid,
            user_id=user_id,
            group_id=group_id,
            from_account_id=data.from_account_id,
            to_account_id=data.to_account_id,
            amount=data.amount,
            date=data.date,
            comment=data.comment,
        )
        db.add(row)
    await db.flush()
    return row


async def _upsert_recurring(db: AsyncSession, group_id: str, user_id: str, data: RecurringPaymentCreate) -> RecurringPayment:
    import json

    cid = data.client_id or str(uuid.uuid4())
    result = await db.execute(
        select(RecurringPayment).where(RecurringPayment.client_id == cid, RecurringPayment.group_id == group_id)
    )
    row = result.scalar_one_or_none()
    label_ids_json = json.dumps(data.label_ids) if data.label_ids else None
    if row:
        row.account_id = data.account_id
        row.category_id = data.category_id
        row.type = data.type or "expense"
        row.amount = data.amount
        row.frequency = data.frequency
        row.next_run_at = data.next_run_at
        row.comment = data.comment
        row.label_ids = label_ids_json
        row.label_names = data.label_names
        row.active = data.active
        row.updated_at = _utcnow()
        row.deleted_at = None
    else:
        row = RecurringPayment(
            id=str(uuid.uuid4()),
            client_id=cid,
            user_id=user_id,
            group_id=group_id,
            account_id=data.account_id,
            category_id=data.category_id,
            type=data.type or "expense",
            amount=data.amount,
            frequency=data.frequency,
            next_run_at=data.next_run_at,
            comment=data.comment,
            label_ids=label_ids_json,
            label_names=data.label_names,
            active=data.active,
        )
        db.add(row)
    await db.flush()
    return row


async def _upsert_reminder(db: AsyncSession, group_id: str, user_id: str, data: ReminderCreate, completed_at=None) -> Reminder:
    cid = data.client_id or str(uuid.uuid4())
    result = await db.execute(select(Reminder).where(Reminder.client_id == cid, Reminder.group_id == group_id))
    row = result.scalar_one_or_none()
    if row:
        row.title = data.title
        row.due_at = data.due_at
        row.recurrence = data.recurrence
        row.notes = data.notes
        row.recurring_payment_id = data.recurring_payment_id
        row.payload = data.payload
        if completed_at is not None:
            row.completed_at = completed_at
        row.updated_at = _utcnow()
        row.deleted_at = None
    else:
        row = Reminder(
            id=str(uuid.uuid4()),
            client_id=cid,
            user_id=user_id,
            group_id=group_id,
            title=data.title,
            due_at=data.due_at,
            recurrence=data.recurrence,
            notes=data.notes,
            recurring_payment_id=data.recurring_payment_id,
            payload=data.payload,
            completed_at=completed_at,
        )
        db.add(row)
    await db.flush()
    return row


async def _soft_delete(db: AsyncSession, group_id: str, user_id: str, entity: str, client_id: str) -> str | None:
    model_map = {
        "account": Account,
        "category": Category,
        "label": Label,
        "transaction": Transaction,
        "transfer": Transfer,
        "recurring": RecurringPayment,
        "reminder": Reminder,
    }
    model = model_map.get(entity)
    if not model:
        return None
    result = await db.execute(select(model).where(model.client_id == client_id, model.group_id == group_id))
    row = result.scalar_one_or_none()
    if not row:
        return None
    row.deleted_at = _utcnow()
    row.updated_at = _utcnow()
    return row.id


async def push_mutations(db: AsyncSession, group_id: str, user_id: str, mutations: list[SyncMutation]) -> SyncPushResponse:
    from app.schemas.common import SyncEntityMapping

    mappings: list[SyncEntityMapping] = []

    for m in mutations:
        if m.op == "delete":
            server_id = await _soft_delete(db, group_id, user_id, m.entity, m.client_id)
            if server_id:
                mappings.append(SyncEntityMapping(entity=m.entity, client_id=m.client_id, server_id=server_id))
            continue

        payload = dict(m.payload or {})
        if m.entity == "account":
            data = AccountCreate(client_id=m.client_id, **payload)
            row = await _upsert_account(db, group_id, user_id, data)
        elif m.entity == "category":
            data = CategoryCreate(client_id=m.client_id, **payload)
            row = await _upsert_category(db, group_id, user_id, data)
        elif m.entity == "label":
            data = LabelCreate(client_id=m.client_id, **payload)
            row = await _upsert_label(db, group_id, user_id, data)
        elif m.entity == "transaction":
            data = TransactionCreate(client_id=m.client_id, **payload)
            row = await _upsert_transaction(db, group_id, user_id, data)
        elif m.entity == "transfer":
            data = TransferCreate(client_id=m.client_id, **payload)
            row = await _upsert_transfer(db, group_id, user_id, data)
        elif m.entity == "recurring":
            data = RecurringPaymentCreate(client_id=m.client_id, **payload)
            row = await _upsert_recurring(db, group_id, user_id, data)
        elif m.entity == "reminder":
            completed_at = payload.pop("completed_at", None)
            data = ReminderCreate(client_id=m.client_id, **payload)
            row = await _upsert_reminder(db, group_id, user_id, data, completed_at=completed_at)
        else:
            continue
        mappings.append(SyncEntityMapping(entity=m.entity, client_id=m.client_id, server_id=row.id))

    await db.commit()
    return SyncPushResponse(mappings=mappings, server_time=_utcnow())
