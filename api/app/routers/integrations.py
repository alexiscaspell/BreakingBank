import secrets
import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_group, get_current_user, require_group_editor
from app.models.category import Category
from app.models.group import Group, GroupMember
from app.models.integration import CounterpartyRule, IntegrationSource, PendingImport
from app.models.user import User
from app.schemas.integrations import (
    CounterpartyPayload,
    CounterpartyRuleCreate,
    CounterpartyRuleResponse,
    CounterpartyRuleUpdate,
    IngestEvent,
    IngestResult,
    IntegrationSourceResponse,
    IntegrationSourceUpdate,
    IntegrationTokenResponse,
    NotificationIngestRequest,
    PendingImportAccept,
    PendingImportResponse,
)
from app.services.ingest import create_transaction_from_pending, ingest_event, normalize_alias, normalize_digits, serialize_pending
from app.services.notification_parsers import parse_notification
from app.services.seed import ensure_integration_sources, ensure_integration_token

router = APIRouter(prefix="/integrations", tags=["integrations"])


async def get_group_from_integration_token(
    x_integration_token: str | None = Header(None, alias="X-Integration-Token"),
    db: AsyncSession = Depends(get_db),
) -> tuple[Group, str]:
    if not x_integration_token:
        raise HTTPException(status_code=401, detail="Missing integration token")
    result = await db.execute(select(Group).where(Group.integration_token == x_integration_token))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=401, detail="Invalid integration token")
    owner = await db.execute(
        select(GroupMember).where(GroupMember.group_id == group.id, GroupMember.role == "owner").limit(1)
    )
    membership = owner.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=400, detail="Group has no owner")
    return group, membership.user_id


@router.get("/sources", response_model=list[IntegrationSourceResponse])
async def list_sources(
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ensure_integration_sources(db, group.id)
    await db.commit()
    result = await db.execute(
        select(IntegrationSource)
        .where(IntegrationSource.group_id == group.id, IntegrationSource.deleted_at.is_(None))
        .order_by(IntegrationSource.display_name)
    )
    return list(result.scalars().all())


@router.put("/sources/{source_id}", response_model=IntegrationSourceResponse)
async def update_source(
    source_id: str,
    body: IntegrationSourceUpdate,
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    _editor=Depends(require_group_editor),
    db: AsyncSession = Depends(get_db),
):
    src = await db.get(IntegrationSource, source_id)
    if not src or src.group_id != group.id or src.deleted_at:
        raise HTTPException(status_code=404, detail="Source not found")
    data = body.model_dump(exclude_unset=True)
    if "default_account_id" in data:
        src.default_account_id = data["default_account_id"]
    if "enabled" in data:
        src.enabled = bool(data["enabled"])
    await db.commit()
    await db.refresh(src)
    return src


@router.get("/token", response_model=IntegrationTokenResponse)
async def get_token(
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    _editor=Depends(require_group_editor),
    db: AsyncSession = Depends(get_db),
):
    token = await ensure_integration_token(db, group)
    await db.commit()
    return IntegrationTokenResponse(token=token)


@router.post("/token/rotate", response_model=IntegrationTokenResponse)
async def rotate_token(
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    _editor=Depends(require_group_editor),
    db: AsyncSession = Depends(get_db),
):
    group.integration_token = secrets.token_urlsafe(32)
    await db.commit()
    return IntegrationTokenResponse(token=group.integration_token)


@router.get("/rules", response_model=list[CounterpartyRuleResponse])
async def list_rules(
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CounterpartyRule)
        .where(CounterpartyRule.group_id == group.id, CounterpartyRule.deleted_at.is_(None))
        .order_by(CounterpartyRule.priority.asc(), CounterpartyRule.created_at.asc())
    )
    return list(result.scalars().all())


@router.post("/rules", response_model=CounterpartyRuleResponse)
async def create_rule(
    body: CounterpartyRuleCreate,
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    _editor=Depends(require_group_editor),
    db: AsyncSession = Depends(get_db),
):
    if body.match_type not in {"cbu", "cvu", "alias", "cuit", "contains"}:
        raise HTTPException(status_code=400, detail="Invalid match_type")
    cat = await db.get(Category, body.category_id)
    if not cat or cat.group_id != group.id or cat.deleted_at:
        raise HTTPException(status_code=400, detail="Invalid category")
    value = body.match_value.strip()
    if body.match_type in {"cbu", "cvu", "cuit"}:
        value = normalize_digits(value) or value
    elif body.match_type == "alias":
        value = normalize_alias(value) or value
    rule = CounterpartyRule(
        id=str(uuid.uuid4()),
        client_id=body.client_id or str(uuid.uuid4()),
        group_id=group.id,
        match_type=body.match_type,
        match_value=value,
        category_id=body.category_id,
        transaction_type=body.transaction_type if body.transaction_type in {"expense", "income"} else "expense",
        priority=body.priority,
        enabled=body.enabled,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.put("/rules/{rule_id}", response_model=CounterpartyRuleResponse)
async def update_rule(
    rule_id: str,
    body: CounterpartyRuleUpdate,
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    _editor=Depends(require_group_editor),
    db: AsyncSession = Depends(get_db),
):
    rule = await db.get(CounterpartyRule, rule_id)
    if not rule or rule.group_id != group.id or rule.deleted_at:
        raise HTTPException(status_code=404, detail="Rule not found")
    data = body.model_dump(exclude_unset=True)
    if "match_value" in data and data["match_value"] is not None:
        mt = data.get("match_type", rule.match_type)
        value = data["match_value"].strip()
        if mt in {"cbu", "cvu", "cuit"}:
            value = normalize_digits(value) or value
        elif mt == "alias":
            value = normalize_alias(value) or value
        data["match_value"] = value
    for field, value in data.items():
        setattr(rule, field, value)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}")
async def delete_rule(
    rule_id: str,
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    _editor=Depends(require_group_editor),
    db: AsyncSession = Depends(get_db),
):
    rule = await db.get(CounterpartyRule, rule_id)
    if not rule or rule.group_id != group.id:
        raise HTTPException(status_code=404, detail="Rule not found")
    rule.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}


@router.get("/pending", response_model=list[PendingImportResponse])
async def list_pending(
    status: str | None = Query(None),
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(PendingImport).where(
        PendingImport.group_id == group.id,
        PendingImport.deleted_at.is_(None),
    )
    if status:
        q = q.where(PendingImport.status == status)
    else:
        q = q.where(PendingImport.status.in_(["pending", "parse_failed"]))
    q = q.order_by(PendingImport.created_at.desc())
    result = await db.execute(q)
    return [serialize_pending(row) for row in result.scalars().all()]


@router.post("/pending/{pending_id}/accept", response_model=PendingImportResponse)
async def accept_pending(
    pending_id: str,
    body: PendingImportAccept,
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    _editor=Depends(require_group_editor),
    db: AsyncSession = Depends(get_db),
):
    pending = await db.get(PendingImport, pending_id)
    if not pending or pending.group_id != group.id or pending.deleted_at:
        raise HTTPException(status_code=404, detail="Pending import not found")
    if pending.status in {"accepted", "auto_applied", "dismissed"}:
        raise HTTPException(status_code=400, detail="Already processed")

    account_id = body.account_id or pending.suggested_account_id
    category_id = body.category_id or pending.suggested_category_id
    amount = body.amount if body.amount is not None else (float(pending.amount) if pending.amount is not None else None)
    if not account_id or not category_id or amount is None:
        raise HTTPException(status_code=400, detail="account_id, category_id and amount are required")

    txn_type = body.type
    if not txn_type:
        txn_type = "income" if pending.direction == "in" else "expense"
    occurred_on = body.date or pending.occurred_on or date.today()
    comment = body.comment if body.comment is not None else pending.comment

    txn = await create_transaction_from_pending(
        db,
        group_id=group.id,
        user_id=user.id,
        pending=pending,
        account_id=account_id,
        category_id=category_id,
        amount=amount,
        txn_type=txn_type,
        comment=comment,
        occurred_on=occurred_on,
    )
    pending.status = "accepted"
    pending.transaction_id = txn.id
    pending.suggested_account_id = account_id
    pending.suggested_category_id = category_id
    pending.amount = amount

    if body.learn_rule:
        match_type = body.learn_match_type
        match_value = body.learn_match_value
        if not match_type or not match_value:
            if pending.counterparty_alias:
                match_type, match_value = "alias", pending.counterparty_alias
            elif pending.counterparty_cbu:
                match_type, match_value = "cbu", pending.counterparty_cbu
            elif pending.counterparty_cvu:
                match_type, match_value = "cvu", pending.counterparty_cvu
            elif pending.counterparty_cuit:
                match_type, match_value = "cuit", pending.counterparty_cuit
            elif pending.counterparty_name:
                match_type, match_value = "contains", pending.counterparty_name
        if match_type and match_value:
            value = match_value.strip()
            if match_type in {"cbu", "cvu", "cuit"}:
                value = normalize_digits(value) or value
            elif match_type == "alias":
                value = normalize_alias(value) or value
            db.add(
                CounterpartyRule(
                    id=str(uuid.uuid4()),
                    client_id=str(uuid.uuid4()),
                    group_id=group.id,
                    match_type=match_type,
                    match_value=value,
                    category_id=category_id,
                    transaction_type=txn_type,
                    priority=100,
                    enabled=True,
                )
            )

    await db.commit()
    await db.refresh(pending)
    return serialize_pending(pending)


@router.post("/pending/{pending_id}/dismiss", response_model=PendingImportResponse)
async def dismiss_pending(
    pending_id: str,
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    _editor=Depends(require_group_editor),
    db: AsyncSession = Depends(get_db),
):
    pending = await db.get(PendingImport, pending_id)
    if not pending or pending.group_id != group.id or pending.deleted_at:
        raise HTTPException(status_code=404, detail="Pending import not found")
    pending.status = "dismissed"
    await db.commit()
    await db.refresh(pending)
    return serialize_pending(pending)


@router.post("/ingest", response_model=IngestResult)
async def ingest(
    body: IngestEvent,
    auth: tuple[Group, str] = Depends(get_group_from_integration_token),
    db: AsyncSession = Depends(get_db),
):
    group, owner_id = auth
    try:
        return await ingest_event(db, group_id=group.id, user_id=owner_id, event=body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/ingest/notification", response_model=IngestResult)
async def ingest_notification(
    body: NotificationIngestRequest,
    auth: tuple[Group, str] = Depends(get_group_from_integration_token),
    db: AsyncSession = Depends(get_db),
):
    group, owner_id = auth
    parsed = parse_notification(
        android_package=body.android_package,
        title=body.title,
        text=body.text,
    )
    if not parsed:
        raise HTTPException(status_code=400, detail="Unsupported android package")
    event = IngestEvent(
        source=parsed.source,
        amount=parsed.amount,
        currency="ARS",
        occurred_at=body.posted_at or datetime.now(timezone.utc),
        direction=parsed.direction,
        android_package=body.android_package,
        counterparty=CounterpartyPayload(
            cbu=parsed.cbu,
            cvu=parsed.cvu,
            alias=parsed.alias,
            name=parsed.name,
            cuit=parsed.cuit,
        ),
        raw={"title": body.title, "text": body.text},
    )
    try:
        return await ingest_event(db, group_id=group.id, user_id=owner_id, event=event)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
