import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_group, get_current_user, require_group_editor
from app.models.group import Group
from app.models.category import Category
from app.models.user import User
from app.schemas.common import CategoryCreate, CategoryResponse, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
async def list_categories(type: str | None = None, group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    q = select(Category).where(Category.group_id == group.id, Category.deleted_at.is_(None))
    if type:
        q = q.where(Category.type == type)
    result = await db.execute(q.order_by(Category.sort_order, Category.name))
    return result.scalars().all()


@router.post("", response_model=CategoryResponse)
async def create_category(body: CategoryCreate, group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cat = Category(
        id=str(uuid.uuid4()),
        client_id=body.client_id or str(uuid.uuid4()),
        user_id=user.id,
        group_id=group.id,
        **body.model_dump(exclude={"client_id"}),
    )
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return cat


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: str, body: CategoryUpdate, group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cat = await db.get(Category, category_id)
    if not cat or cat.group_id != group.id or cat.deleted_at:
        raise HTTPException(status_code=404, detail="Category not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    await db.commit()
    await db.refresh(cat)
    return cat


@router.delete("/{category_id}")
async def delete_category(category_id: str, group: Group = Depends(get_current_group), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cat = await db.get(Category, category_id)
    if not cat or cat.group_id != group.id:
        raise HTTPException(status_code=404, detail="Category not found")
    cat.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}
