from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import accounts, analytics, auth, categories, export_import, files, groups, labels, recurring, reminders, sync, transactions, transfers
from app.services.storage import storage_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    try:
        storage_service.ensure_bucket()
    except Exception:
        pass
    yield


app = FastAPI(title="BreakingBank API", lifespan=lifespan)

origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(groups.router)
app.include_router(accounts.router)
app.include_router(categories.router)
app.include_router(labels.router)
app.include_router(transactions.router)
app.include_router(transfers.router)
app.include_router(recurring.router)
app.include_router(reminders.router)
app.include_router(analytics.router)
app.include_router(files.router)
app.include_router(export_import.router)
app.include_router(sync.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
