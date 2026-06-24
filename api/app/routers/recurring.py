import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_group, get_current_user, require_group_editor
from app.models.group import Group
from app.models.recurring_payment import RecurringPayment
from app.models.user import User
from app.schemas.common import RecurringPaymentCreate, RecurringPaymentResponse, RecurringPaymentUpdate
from app.services.recurring_schedule import compute_initial_next_run

router = APIRouter(prefix="/recurring-payments", tags=["recurring"])


def _label_ids_to_json(label_ids: list[str] | None) -> str | None:
    if not label_ids:
        return None
    return json.dumps(label_ids)


def _label_ids_from_json(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else []
    except json.JSONDecodeError:
        return []


def _to_response(row: RecurringPayment) -> RecurringPaymentResponse:
    return RecurringPaymentResponse(
        id=row.id,
        client_id=row.client_id,
        account_id=row.account_id,
        category_id=row.category_id,
        type=row.type or "expense",
        amount=float(row.amount),
        frequency=row.frequency,
        next_run_at=row.next_run_at,
        comment=row.comment,
        label_ids=_label_ids_from_json(row.label_ids),
        label_names=row.label_names,
        active=row.active,
        created_at=row.created_at,
        updated_at=row.updated_at,
        deleted_at=row.deleted_at,
    )


def _apply_create(body: RecurringPaymentCreate) -> dict:
    data = body.model_dump(exclude={"client_id", "label_ids"})
    data["label_ids"] = _label_ids_to_json(body.label_ids)
    data["type"] = body.type or "expense"
    return data


@router.get("", response_model=list[RecurringPaymentResponse])
async def list_recurring(
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RecurringPayment).where(RecurringPayment.group_id == group.id, RecurringPayment.deleted_at.is_(None))
    )
    return [_to_response(r) for r in result.scalars().all()]


@router.get("/{item_id}", response_model=RecurringPaymentResponse)
async def get_recurring(
    item_id: str,
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await db.get(RecurringPayment, item_id)
    if not r or r.group_id != group.id or r.deleted_at:
        raise HTTPException(status_code=404, detail="Not found")
    return _to_response(r)


@router.post("", response_model=RecurringPaymentResponse)
async def create_recurring(
    body: RecurringPaymentCreate,
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    _editor=Depends(require_group_editor),
    db: AsyncSession = Depends(get_db),
):
    fields = _apply_create(body)
    if body.frequency not in {"daily", "weekly", "monthly", "yearly"}:
        raise HTTPException(status_code=400, detail="Invalid frequency")
    fields["next_run_at"] = compute_initial_next_run(body.next_run_at, body.frequency)
    r = RecurringPayment(
        id=str(uuid.uuid4()),
        client_id=body.client_id or str(uuid.uuid4()),
        user_id=user.id,
        group_id=group.id,
        **fields,
    )
    db.add(r)
    await db.commit()
    await db.refresh(r)
    return _to_response(r)


@router.put("/{item_id}", response_model=RecurringPaymentResponse)
async def update_recurring(
    item_id: str,
    body: RecurringPaymentUpdate,
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    _editor=Depends(require_group_editor),
    db: AsyncSession = Depends(get_db),
):
    r = await db.get(RecurringPayment, item_id)
    if not r or r.group_id != group.id or r.deleted_at:
        raise HTTPException(status_code=404, detail="Not found")
    data = body.model_dump(exclude_unset=True)
    if "label_ids" in data:
        data["label_ids"] = _label_ids_to_json(data.pop("label_ids"))
    if "frequency" in data and data["frequency"] not in {"daily", "weekly", "monthly", "yearly"}:
        raise HTTPException(status_code=400, detail="Invalid frequency")
    if "next_run_at" in data and "frequency" in data:
        data["next_run_at"] = compute_initial_next_run(data["next_run_at"], data["frequency"])
    elif "next_run_at" in data and "frequency" not in data:
        data["next_run_at"] = compute_initial_next_run(data["next_run_at"], r.frequency)
    for field, value in data.items():
        setattr(r, field, value)
    r.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(r)
    return _to_response(r)


@router.delete("/{item_id}")
async def delete_recurring(
    item_id: str,
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    _editor=Depends(require_group_editor),
    db: AsyncSession = Depends(get_db),
):
    r = await db.get(RecurringPayment, item_id)
    if not r or r.group_id != group.id:
        raise HTTPException(status_code=404, detail="Not found")
    r.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}
