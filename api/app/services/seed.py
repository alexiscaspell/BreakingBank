import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.category import Category
from app.models.label import Label

DEFAULT_CATEGORIES = [
    ("Supermercado", "expense", "#e91e8c", "supermarket"),
    ("Casa", "expense", "#4ecdc4", "house"),
    ("Transporte", "expense", "#2196F3", "transport"),
    ("Carnicería", "expense", "#f44336", "meat"),
    ("Verdulería", "expense", "#4CAF50", "greengrocer"),
    ("Delivery", "expense", "#FFC107", "delivery"),
    ("Gasto hormiga", "expense", "#1a3d2e", "ant"),
    ("Regalos", "expense", "#e91e8c", "gift"),
    ("Otros", "expense", "#9E9E9E", "other"),
    ("Salario", "income", "#4CAF50", "salary"),
    ("Otros ingresos", "income", "#9E9E9E", "other"),
]

DEFAULT_LABELS = ["Alimentos", "Cena", "Limpieza", "Regalo", "Uber", "Servicio", "Gasto fijo", "Noche", "Tarde"]


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

    await db.commit()
