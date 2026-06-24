from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_group, get_current_user
from app.models.group import Group
from app.models.user import User
from app.schemas.common import SyncPullResponse, SyncPushRequest, SyncPushResponse
from app.services.sync import pull_changes, push_mutations

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("/push", response_model=SyncPushResponse)
async def sync_push(
    body: SyncPushRequest,
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await push_mutations(db, group.id, user.id, body.mutations)


@router.get("/pull", response_model=SyncPullResponse)
async def sync_pull(
    since: datetime | None = Query(None),
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await pull_changes(db, group.id, since)
