import secrets
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.category_presets import DEFAULT_CATEGORIES
from app.constants.integration_presets import INTEGRATION_PRESETS
from app.models.account import Account
from app.models.category import Category
from app.models.group import Group
from app.models.integration import IntegrationSource
from app.models.label import Label

DEFAULT_LABELS = ["Alimentos", "Cena", "Limpieza", "Regalo", "Uber", "Servicio", "Gasto fijo", "Noche", "Tarde"]


async def ensure_integration_sources(db: AsyncSession, group_id: str) -> None:
    result = await db.execute(
        select(IntegrationSource).where(
            IntegrationSource.group_id == group_id,
            IntegrationSource.deleted_at.is_(None),
        )
    )
    existing = {row.key for row in result.scalars().all()}
    for preset in INTEGRATION_PRESETS:
        if preset["key"] in existing:
            continue
        db.add(
            IntegrationSource(
                id=str(uuid.uuid4()),
                client_id=str(uuid.uuid4()),
                group_id=group_id,
                key=preset["key"],
                display_name=preset["display_name"],
                android_package=preset["android_package"],
                enabled=False,
            )
        )


async def ensure_integration_token(db: AsyncSession, group: Group) -> str:
    if group.integration_token:
        return group.integration_token
    group.integration_token = secrets.token_urlsafe(32)
    await db.flush()
    return group.integration_token


async def seed_group_data(db: AsyncSession, group_id: str, user_id: str) -> None:
    acc = Account(
        id=str(uuid.uuid4()),
        client_id=str(uuid.uuid4()),
        user_id=user_id,
        group_id=group_id,
        name="Principal",
        icon_key="wallet",
        color="#4ecdc4",
    )
    db.add(acc)

    for i, (name, typ, color, key) in enumerate(DEFAULT_CATEGORIES):
        db.add(
            Category(
                id=str(uuid.uuid4()),
                client_id=str(uuid.uuid4()),
                user_id=user_id,
                group_id=group_id,
                name=name,
                type=typ,
                color=color,
                icon_type="preset",
                icon_key=key,
                sort_order=i,
            )
        )

    for name in DEFAULT_LABELS:
        db.add(
            Label(
                id=str(uuid.uuid4()),
                client_id=str(uuid.uuid4()),
                user_id=user_id,
                group_id=group_id,
                name=name,
            )
        )

    await ensure_integration_sources(db, group_id)
    group = await db.get(Group, group_id)
    if group:
        await ensure_integration_token(db, group)

    await db.commit()
