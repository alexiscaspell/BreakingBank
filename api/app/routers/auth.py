import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.auth import GoogleAuthRequest, LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services.groups import create_personal_group
from app.services.seed import seed_group_data
from app.services.auth import (
    create_access_token,
    create_refresh_token,
    create_user,
    get_user_by_email,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if await get_user_by_email(db, body.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = await create_user(db, body.email, body.username, body.password)
    group = await create_personal_group(db, user)
    user.active_group_id = group.id
    await db.commit()
    await seed_group_data(db, group.id, user.id)
    return TokenResponse(access_token=create_access_token(user.id), refresh_token=create_refresh_token(user.id))


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_email(db, body.email)
    if not user or not user.hashed_password or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(access_token=create_access_token(user.id), refresh_token=create_refresh_token(user.id))


@router.post("/google", response_model=TokenResponse)
async def google_auth(body: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    if not settings.google_client_id:
        raise HTTPException(status_code=501, detail="Google auth not configured")
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": body.id_token},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    data = resp.json()
    allowed_audiences = {settings.google_client_id, settings.google_android_client_id} - {""}
    if data.get("aud") not in allowed_audiences:
        raise HTTPException(status_code=401, detail="Invalid Google audience")
    email = data["email"]
    user = await get_user_by_email(db, email)
    if not user:
        user = await create_user(db, email, data.get("name", email.split("@")[0]), google_sub=data["sub"])
        group = await create_personal_group(db, user)
        user.active_group_id = group.id
        await db.commit()
        await seed_group_data(db, group.id, user.id)
    return TokenResponse(access_token=create_access_token(user.id), refresh_token=create_refresh_token(user.id))


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return user
