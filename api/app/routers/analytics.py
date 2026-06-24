from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_group, get_current_user, require_group_editor
from app.models.group import Group
from app.models.user import User
from app.schemas.common import AnalyticsSummary
from app.services.analytics import summary_by_category

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def analytics_summary(
    type: str = Query("expense"),
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    account_id: str | None = None,
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await summary_by_category(db, group.id, type, from_date, to_date, account_id)
