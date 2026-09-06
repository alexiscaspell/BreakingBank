"""Ingest normalized bank/wallet events and apply hybrid matching rules."""

from __future__ import annotations

import hashlib
import json
import re
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.integration_presets import INTEGRATION_KEYS, PACKAGE_TO_SOURCE
from app.models.integration import CounterpartyRule, IntegrationSource, PendingImport
from app.models.transaction import Transaction
from app.schemas.integrations import IngestEvent, IngestResult, PendingImportResponse


EXACT_MATCH_TYPES = frozenset({"cbu", "cvu", "alias", "cuit"})


def normalize_digits(value: str | None) -> str | None:
    if not value:
        return None
    digits = re.sub(r"\D", "", value)
    return digits or None


def normalize_alias(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = value.strip().lower()
    return cleaned or None


def normalize_text(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = re.sub(r"\s+", " ", value.strip().lower())
    return cleaned or None


def fingerprint_external_id(event: IngestEvent) -> str:
    if event.external_id:
        return event.external_id[:120]
    cp = event.counterparty
    raw = "|".join(
        [
            event.source,
            f"{event.amount:.2f}" if event.amount is not None else "",
            event.occurred_at.date().isoformat() if event.occurred_at else "",
            event.direction,
            normalize_digits(cp.cbu) or "",
            normalize_digits(cp.cvu) or "",
            normalize_alias(cp.alias) or "",
            normalize_digits(cp.cuit) or "",
            normalize_text(cp.name) or "",
            normalize_text(json.dumps(event.raw, sort_keys=True, ensure_ascii=False)) or "",
        ]
    )
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:40]
    return f"{event.source}:notif:{digest}"


def resolve_source(event: IngestEvent) -> str:
    if event.source in INTEGRATION_KEYS:
        return event.source
    if event.android_package and event.android_package in PACKAGE_TO_SOURCE:
        return PACKAGE_TO_SOURCE[event.android_package]
    raise ValueError(f"Unknown integration source: {event.source}")


def serialize_pending(row: PendingImport) -> PendingImportResponse:
    return PendingImportResponse(
        id=row.id,
        client_id=row.client_id,
        source=row.source,
        external_id=row.external_id,
        amount=float(row.amount) if row.amount is not None else None,
        currency=row.currency,
        occurred_on=row.occurred_on,
        direction=row.direction,
        counterparty_cbu=row.counterparty_cbu,
        counterparty_cvu=row.counterparty_cvu,
        counterparty_alias=row.counterparty_alias,
        counterparty_name=row.counterparty_name,
        counterparty_cuit=row.counterparty_cuit,
        suggested_account_id=row.suggested_account_id,
        suggested_category_id=row.suggested_category_id,
        match_type=row.match_type,
        confidence=row.confidence,
        status=row.status,
        raw_payload=row.raw_payload,
        comment=row.comment,
        transaction_id=row.transaction_id,
        created_at=row.created_at,
        updated_at=row.updated_at,
        deleted_at=row.deleted_at,
    )


async def _find_existing_transaction(
    db: AsyncSession, group_id: str, source: str, external_id: str
) -> Transaction | None:
    result = await db.execute(
        select(Transaction).where(
            Transaction.group_id == group_id,
            Transaction.source == source,
            Transaction.external_id == external_id,
            Transaction.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def _find_existing_pending(
    db: AsyncSession, group_id: str, source: str, external_id: str
) -> PendingImport | None:
    result = await db.execute(
        select(PendingImport).where(
            PendingImport.group_id == group_id,
            PendingImport.source == source,
            PendingImport.external_id == external_id,
            PendingImport.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def _resolve_account(db: AsyncSession, group_id: str, source: str) -> str | None:
    result = await db.execute(
        select(IntegrationSource).where(
            IntegrationSource.group_id == group_id,
            IntegrationSource.key == source,
            IntegrationSource.deleted_at.is_(None),
        )
    )
    src = result.scalar_one_or_none()
    if not src or not src.enabled:
        return None
    return src.default_account_id


async def _match_rule(
    db: AsyncSession,
    group_id: str,
    *,
    cbu: str | None,
    cvu: str | None,
    alias: str | None,
    cuit: str | None,
    name: str | None,
) -> tuple[CounterpartyRule | None, str | None, float]:
    result = await db.execute(
        select(CounterpartyRule)
        .where(
            CounterpartyRule.group_id == group_id,
            CounterpartyRule.enabled.is_(True),
            CounterpartyRule.deleted_at.is_(None),
        )
        .order_by(CounterpartyRule.priority.asc(), CounterpartyRule.created_at.asc())
    )
    rules = list(result.scalars().all())

    candidates: list[tuple[str, str | None]] = [
        ("cbu", cbu),
        ("cvu", cvu),
        ("alias", alias),
        ("cuit", cuit),
    ]
    for match_type, value in candidates:
        if not value:
            continue
        for rule in rules:
            if rule.match_type != match_type:
                continue
            expected = normalize_digits(rule.match_value) if match_type in {"cbu", "cvu", "cuit"} else normalize_alias(rule.match_value)
            if expected and expected == value:
                return rule, match_type, 1.0

    if name:
        for rule in rules:
            if rule.match_type != "contains":
                continue
            needle = normalize_text(rule.match_value)
            if needle and needle in name:
                return rule, "contains", 0.6

    return None, None, 0.0


def _build_comment(event: IngestEvent, source: str) -> str | None:
    parts = []
    cp = event.counterparty
    if cp.name:
        parts.append(cp.name)
    elif cp.alias:
        parts.append(cp.alias)
    parts.append(f"via {source}")
    return " · ".join(parts) if parts else None


async def create_transaction_from_pending(
    db: AsyncSession,
    *,
    group_id: str,
    user_id: str,
    pending: PendingImport,
    account_id: str,
    category_id: str,
    amount: float,
    txn_type: str,
    comment: str | None,
    occurred_on: date,
) -> Transaction:
    txn = Transaction(
        id=str(uuid.uuid4()),
        client_id=str(uuid.uuid4()),
        user_id=user_id,
        group_id=group_id,
        account_id=account_id,
        category_id=category_id,
        type=txn_type,
        amount=amount,
        date=occurred_on,
        comment=comment,
        source=pending.source,
        external_id=pending.external_id,
    )
    db.add(txn)
    await db.flush()
    return txn


async def ingest_event(
    db: AsyncSession,
    *,
    group_id: str,
    user_id: str,
    event: IngestEvent,
) -> IngestResult:
    source = resolve_source(event)
    external_id = fingerprint_external_id(event)

    existing_txn = await _find_existing_transaction(db, group_id, source, external_id)
    if existing_txn:
        return IngestResult(status="duplicate", transaction_id=existing_txn.id, message="Already imported")

    existing_pending = await _find_existing_pending(db, group_id, source, external_id)
    if existing_pending and existing_pending.status in {"pending", "auto_applied", "accepted"}:
        return IngestResult(
            status="duplicate",
            pending_import_id=existing_pending.id,
            transaction_id=existing_pending.transaction_id,
            message="Already queued",
        )

    cp = event.counterparty
    cbu = normalize_digits(cp.cbu)
    cvu = normalize_digits(cp.cvu)
    alias = normalize_alias(cp.alias)
    cuit = normalize_digits(cp.cuit)
    name = normalize_text(cp.name)

    account_id = await _resolve_account(db, group_id, source)
    rule, match_type, confidence = await _match_rule(
        db, group_id, cbu=cbu, cvu=cvu, alias=alias, cuit=cuit, name=name
    )

    occurred_on = event.occurred_at.date() if event.occurred_at else date.today()
    direction = event.direction if event.direction in {"in", "out"} else "out"
    txn_type = "income" if direction == "in" else "expense"
    if rule:
        txn_type = rule.transaction_type

    comment = _build_comment(event, source)
    raw_payload = json.dumps(
        {
            "source": source,
            "android_package": event.android_package,
            "amount": event.amount,
            "currency": event.currency,
            "occurred_at": event.occurred_at.isoformat() if event.occurred_at else None,
            "direction": direction,
            "counterparty": cp.model_dump(),
            "raw": event.raw,
        },
        ensure_ascii=False,
    )

    status = "pending"
    if event.amount is None:
        status = "parse_failed"
        confidence = 0.0

    category_id = rule.category_id if rule else None
    clear_match = (
        status != "parse_failed"
        and account_id is not None
        and category_id is not None
        and match_type in EXACT_MATCH_TYPES
        and event.amount is not None
    )

    pending = existing_pending or PendingImport(
        id=str(uuid.uuid4()),
        client_id=str(uuid.uuid4()),
        group_id=group_id,
        source=source,
        external_id=external_id,
    )
    pending.amount = event.amount
    pending.currency = event.currency or "ARS"
    pending.occurred_on = occurred_on
    pending.direction = direction
    pending.counterparty_cbu = cbu
    pending.counterparty_cvu = cvu
    pending.counterparty_alias = alias
    pending.counterparty_name = cp.name
    pending.counterparty_cuit = cuit
    pending.suggested_account_id = account_id
    pending.suggested_category_id = category_id
    pending.match_type = match_type
    pending.confidence = confidence
    pending.raw_payload = raw_payload
    pending.comment = comment
    pending.updated_at = datetime.now(timezone.utc)

    if clear_match:
        txn = await create_transaction_from_pending(
            db,
            group_id=group_id,
            user_id=user_id,
            pending=pending,
            account_id=account_id,
            category_id=category_id,
            amount=float(event.amount),
            txn_type=txn_type,
            comment=comment,
            occurred_on=occurred_on,
        )
        pending.status = "auto_applied"
        pending.transaction_id = txn.id
        if not existing_pending:
            db.add(pending)
        await db.commit()
        return IngestResult(
            status="auto_applied",
            pending_import_id=pending.id,
            transaction_id=txn.id,
            pending=serialize_pending(pending),
        )

    pending.status = status
    if not existing_pending:
        db.add(pending)
    await db.commit()
    await db.refresh(pending)
    return IngestResult(
        status=status,
        pending_import_id=pending.id,
        pending=serialize_pending(pending),
        message=None if status == "pending" else "Could not parse amount",
    )
