import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Label(Base):
    __tablename__ = "labels"
    __table_args__ = (UniqueConstraint("group_id", "client_id", name="uq_label_group_client"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(String(36), index=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    group_id: Mapped[str] = mapped_column(String(36), ForeignKey("groups.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="labels")
    transaction_labels = relationship("TransactionLabel", back_populates="label")


class TransactionLabel(Base):
    __tablename__ = "transaction_labels"

    transaction_id: Mapped[str] = mapped_column(String(36), ForeignKey("transactions.id"), primary_key=True)
    label_id: Mapped[str] = mapped_column(String(36), ForeignKey("labels.id"), primary_key=True)

    label = relationship("Label", back_populates="transaction_labels")
    transaction = relationship("Transaction", back_populates="transaction_labels")
