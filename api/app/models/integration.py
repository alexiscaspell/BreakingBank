import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class IntegrationSource(Base):
    __tablename__ = "integration_sources"
    __table_args__ = (UniqueConstraint("group_id", "key", name="uq_integration_source_group_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(String(36), index=True, default=lambda: str(uuid.uuid4()))
    group_id: Mapped[str] = mapped_column(String(36), ForeignKey("groups.id"), index=True)
    key: Mapped[str] = mapped_column(String(40))  # mercadopago | santander | banco_provincia
    display_name: Mapped[str] = mapped_column(String(100))
    android_package: Mapped[str] = mapped_column(String(120))
    default_account_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("accounts.id"), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class CounterpartyRule(Base):
    __tablename__ = "counterparty_rules"
    __table_args__ = (UniqueConstraint("group_id", "client_id", name="uq_counterparty_rule_group_client"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(String(36), index=True, default=lambda: str(uuid.uuid4()))
    group_id: Mapped[str] = mapped_column(String(36), ForeignKey("groups.id"), index=True)
    match_type: Mapped[str] = mapped_column(String(20))  # cbu | cvu | alias | cuit | contains
    match_value: Mapped[str] = mapped_column(String(200))
    category_id: Mapped[str] = mapped_column(String(36), ForeignKey("categories.id"), index=True)
    transaction_type: Mapped[str] = mapped_column(String(20), default="expense")  # expense | income
    priority: Mapped[int] = mapped_column(Integer, default=100)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PendingImport(Base):
    __tablename__ = "pending_imports"
    __table_args__ = (UniqueConstraint("group_id", "source", "external_id", name="uq_pending_import_ext"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(String(36), index=True, default=lambda: str(uuid.uuid4()))
    group_id: Mapped[str] = mapped_column(String(36), ForeignKey("groups.id"), index=True)
    source: Mapped[str] = mapped_column(String(40), index=True)
    external_id: Mapped[str] = mapped_column(String(120), index=True)
    amount: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="ARS")
    occurred_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    direction: Mapped[str] = mapped_column(String(10), default="out")  # out | in
    counterparty_cbu: Mapped[str | None] = mapped_column(String(30), nullable=True)
    counterparty_cvu: Mapped[str | None] = mapped_column(String(30), nullable=True)
    counterparty_alias: Mapped[str | None] = mapped_column(String(100), nullable=True)
    counterparty_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    counterparty_cuit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    suggested_account_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    suggested_category_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    match_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    # pending | accepted | dismissed | auto_applied | parse_failed
    raw_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    transaction_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("transactions.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
