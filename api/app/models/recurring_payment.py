import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RecurringPayment(Base):
    __tablename__ = "recurring_payments"
    __table_args__ = (UniqueConstraint("group_id", "client_id", name="uq_recurring_group_client"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(String(36), index=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    group_id: Mapped[str] = mapped_column(String(36), ForeignKey("groups.id"), index=True)
    account_id: Mapped[str] = mapped_column(String(36), ForeignKey("accounts.id"))
    category_id: Mapped[str] = mapped_column(String(36), ForeignKey("categories.id"))
    type: Mapped[str] = mapped_column(String(20), default="expense")  # expense | income
    amount: Mapped[float] = mapped_column(Numeric(18, 2))
    frequency: Mapped[str] = mapped_column(String(20))  # daily|weekly|monthly|yearly
    next_run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    comment: Mapped[str | None] = mapped_column(String(4096), nullable=True)
    label_ids: Mapped[str | None] = mapped_column(String(500), nullable=True)  # JSON array
    label_names: Mapped[str | None] = mapped_column(String(500), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
