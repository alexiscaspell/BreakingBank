from datetime import date, datetime
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_group, get_current_user, require_group_editor
from app.services.spreadsheet import (
    export_month,
    import_transactions,
    parse_csv_bytes,
    parse_xlsx_bytes,
    period_title,
    row_to_values,
    rows_to_csv,
    rows_to_xlsx,
    HEADERS,
)

router = APIRouter(prefix="/export", tags=["export"])


class RenderExportRow(BaseModel):
    date: date
    category_name: str
    account_name: str
    amount: float
    labels: list[str] = Field(default_factory=list)
    comment: str | None = None


class RenderExportRequest(BaseModel):
    type: Literal["expense", "income"]
    year: int = Field(..., ge=2000, le=2100)
    month: int = Field(..., ge=1, le=12)
    currency: str = "ARS"
    format: Literal["xlsx", "csv"] = "xlsx"
    rows: list[RenderExportRow]


@router.post("/transactions/render")
async def render_transactions_export(
    body: RenderExportRequest,
    user: User = Depends(get_current_user),
):
    data_rows = [
        row_to_values(
            row.date,
            row.category_name,
            row.account_name,
            row.amount,
            body.currency.upper(),
            row.labels,
            row.comment,
        )
        for row in body.rows
    ]
    sheet = [[period_title(body.type, body.year, body.month)], HEADERS, *data_rows]
    stamp = datetime.now().strftime("%Y_%m_%d_%H_%M_%S_%f")
    if body.format == "csv":
        content = rows_to_csv(sheet)
        filename = f"{stamp}.csv"
        media = "text/csv; charset=utf-8"
    else:
        content = rows_to_xlsx(sheet)
        filename = f"{stamp}.xlsx"
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return Response(
        content=content,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/transactions")
async def export_transactions(
    type: Literal["expense", "income"] = Query(...),
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    format: Literal["xlsx", "csv"] = Query("xlsx"),
    currency: str = Query("ARS", min_length=3, max_length=3),
    group: Group = Depends(get_current_group),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content, filename = await export_month(db, group.id, type, year, month, format, currency.upper())
    media = (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        if format == "xlsx"
        else "text/csv; charset=utf-8"
    )
    return Response(
        content=content,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/transactions/import")
async def import_transactions_file(
    type: Literal["expense", "income"] = Query(...),
    file: UploadFile = File(...),
    group: Group = Depends(get_current_group),
    _editor=Depends(require_group_editor),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")

    name = (file.filename or "").lower()
    if name.endswith(".csv"):
        rows = parse_csv_bytes(raw)
    elif name.endswith(".xlsx"):
        rows = parse_xlsx_bytes(raw)
    else:
        raise HTTPException(status_code=400, detail="Use .xlsx or .csv")

    if not rows:
        raise HTTPException(status_code=400, detail="No se encontraron filas válidas")

    return await import_transactions(db, group.id, user.id, type, rows)
