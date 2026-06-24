from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_group, get_current_user, require_group_editor
from app.models.group import Group
from app.models.user import User
from app.schemas.groups import (
    ActiveGroupUpdate,
    GroupCreate,
    GroupMemberAdd,
    GroupMemberResponse,
    GroupResponse,
)
from app.services.groups import add_member_by_email, create_group, get_user_groups, list_group_members

router = APIRouter(prefix="/groups", tags=["groups"])


def _to_group_response(group: Group, role: str, member_count: int) -> GroupResponse:
    return GroupResponse(
        id=group.id,
        name=group.name,
        created_by=group.created_by,
        role=role,
        member_count=member_count,
        created_at=group.created_at,
    )


@router.get("", response_model=list[GroupResponse])
async def list_my_groups(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = await get_user_groups(db, user.id)
    out: list[GroupResponse] = []
    for group, membership in rows:
        members = await list_group_members(db, group.id)
        out.append(_to_group_response(group, membership.role, len(members)))
    return out


@router.post("", response_model=GroupResponse)
async def create_new_group(
    body: GroupCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await create_group(db, name=body.name, owner=user)
    user.active_group_id = group.id
    await db.commit()
    return _to_group_response(group, "owner", 1)


@router.patch("/active")
async def set_active_group(
    body: ActiveGroupUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.groups import get_membership

    membership = await get_membership(db, user.id, body.group_id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    user.active_group_id = body.group_id
    await db.commit()
    return {"ok": True, "group_id": body.group_id}


@router.get("/{group_id}/members", response_model=list[GroupMemberResponse])
async def get_members(
    group_id: str,
    group: Group = Depends(get_current_group),
    db: AsyncSession = Depends(get_db),
):
    if group.id != group_id:
        raise HTTPException(status_code=404, detail="Group not found")
    members = await list_group_members(db, group.id)
    return [
        GroupMemberResponse(
            id=m.id,
            user_id=m.user_id,
            username=m.user.username if m.user else "",
            email=m.user.email if m.user else "",
            role=m.role,
            joined_at=m.joined_at,
        )
        for m in members
    ]


@router.post("/{group_id}/members", response_model=GroupMemberResponse)
async def invite_member(
    group_id: str,
    body: GroupMemberAdd,
    group: Group = Depends(get_current_group),
    _editor=Depends(require_group_editor),
    db: AsyncSession = Depends(get_db),
):
    if group.id != group_id:
        raise HTTPException(status_code=404, detail="Group not found")
    try:
        member = await add_member_by_email(db, group=group, email=body.email, role=body.role)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    await db.refresh(member, ["user"])
    return GroupMemberResponse(
        id=member.id,
        user_id=member.user_id,
        username=member.user.username if member.user else "",
        email=member.user.email if member.user else "",
        role=member.role,
        joined_at=member.joined_at,
    )
