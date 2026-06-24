from datetime import date

from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.transfer import Transfer
from app.schemas.common import AnalyticsSummary, CategorySummary


async def account_balance(db: AsyncSession, account: Account) -> float:
    initial = float(account.initial_balance or 0)
    tx_result = await db.execute(
        select(
            func.coalesce(
                func.sum(
                    case(
                        (Transaction.type == "income", Transaction.amount),
                        else_=-Transaction.amount,
                    )
                ),
                0,
            )
        ).where(
            Transaction.account_id == account.id,
            Transaction.deleted_at.is_(None),
        )
    )
    tx_delta = float(tx_result.scalar() or 0)
    out_result = await db.execute(
        select(func.coalesce(func.sum(Transfer.amount), 0)).where(
            Transfer.from_account_id == account.id,
            Transfer.deleted_at.is_(None),
        )
    )
    in_result = await db.execute(
        select(func.coalesce(func.sum(Transfer.amount), 0)).where(
            Transfer.to_account_id == account.id,
            Transfer.deleted_at.is_(None),
        )
    )
    return initial + tx_delta - float(out_result.scalar() or 0) + float(in_result.scalar() or 0)


def period_filter(start: date, end: date):
    return and_(Transaction.date >= start, Transaction.date <= end, Transaction.deleted_at.is_(None))


async def summary_by_category(
    db: AsyncSession,
    group_id: str,
    tx_type: str,
    start: date,
    end: date,
    account_id: str | None = None,
) -> AnalyticsSummary:
    filters = [Transaction.group_id == group_id, Transaction.type == tx_type, period_filter(start, end)]
    if account_id:
        filters.append(Transaction.account_id == account_id)

    total_result = await db.execute(select(func.coalesce(func.sum(Transaction.amount), 0)).where(*filters))
    total = float(total_result.scalar() or 0)

    rows = await db.execute(
        select(
            Category.id,
            Category.name,
            Category.color,
            Category.icon_type,
            Category.icon_key,
            Category.icon_storage_key,
            func.coalesce(func.sum(Transaction.amount), 0).label("cat_total"),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .where(*filters)
        .group_by(Category.id)
        .order_by(func.sum(Transaction.amount).desc())
    )

    by_category = []
    for row in rows.all():
        cat_total = float(row.cat_total or 0)
        by_category.append(
            CategorySummary(
                category_id=row.id,
                category_name=row.name,
                color=row.color,
                icon_type=row.icon_type,
                icon_key=row.icon_key,
                icon_storage_key=row.icon_storage_key,
                total=cat_total,
                percentage=round((cat_total / total * 100) if total else 0, 1),
            )
        )
    return AnalyticsSummary(total=total, by_category=by_category)
