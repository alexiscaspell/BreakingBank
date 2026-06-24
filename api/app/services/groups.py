import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.group import Group, GroupMember
from app.models.user import User
from app.services.auth import get_user_by_email


async def create_group(db: AsyncSession, *, name: str, owner: User) -> Group:
    group = Group(id=str(uuid.uuid4()), name=name.strip(), created_by=owner.id)
    db.add(group)
    await db.flush()
    db.add(GroupMember(group_id=group.id, user_id=owner.id, role="owner"))
    await db.commit()
    await db.refresh(group)
    return group


async def create_personal_group(db: AsyncSession, user: User) -> Group:
    return await create_group(db, name=f"{user.username}'s group", owner=user)


async def get_user_groups(db: AsyncSession, user_id: str) -> list[tuple[Group, GroupMember]]:
    result = await db.execute(
        select(Group, GroupMember)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .where(GroupMember.user_id == user_id)
        .options(selectinload(Group.members).selectinload(GroupMember.user))
        .order_by(Group.name)
    )
    return list(result.all())


async def get_membership(db: AsyncSession, user_id: str, group_id: str) -> GroupMember | None:
    result = await db.execute(
        select(GroupMember).where(GroupMember.user_id == user_id, GroupMember.group_id == group_id)
    )
    return result.scalar_one_or_none()


async def add_member_by_email(
    db: AsyncSession, *, group: Group, email: str, role: str = "editor"
) -> GroupMember:
    user = await get_user_by_email(db, email)
    if not user:
        raise ValueError("User not found")
    existing = await get_membership(db, user.id, group.id)
    if existing:
        return existing
    member = GroupMember(group_id=group.id, user_id=user.id, role=role)
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member


async def list_group_members(db: AsyncSession, group_id: str) -> list[GroupMember]:
    result = await db.execute(
        select(GroupMember)
        .where(GroupMember.group_id == group_id)
        .options(selectinload(GroupMember.user))
        .order_by(GroupMember.joined_at)
    )
    return list(result.scalars().all())
