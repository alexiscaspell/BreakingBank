from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.group import Group
from app.models.user import User
from app.services.auth import decode_token
from app.services.groups import get_membership, get_user_groups

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def get_current_group(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    x_group_id: str | None = Header(None, alias="X-Group-Id"),
) -> Group:
    group_id = x_group_id or user.active_group_id
    if not group_id:
        rows = await get_user_groups(db, user.id)
        if not rows:
            raise HTTPException(status_code=400, detail="No group available")
        group_id = rows[0][0].id

    membership = await get_membership(db, user.id, group_id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    group = await db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


async def get_current_membership(
    user: User = Depends(get_current_user),
    group: Group = Depends(get_current_group),
    db: AsyncSession = Depends(get_db),
):
    membership = await get_membership(db, user.id, group.id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    return membership


async def require_group_editor(membership=Depends(get_current_membership)):
    if membership.role == "viewer":
        raise HTTPException(status_code=403, detail="Read-only access")
    return membership
