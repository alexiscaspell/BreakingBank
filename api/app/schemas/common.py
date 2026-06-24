from datetime import date as DateType, datetime

import json

from pydantic import BaseModel, Field, field_validator


class TimestampMixin(BaseModel):
    id: str
    client_id: str
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None


class AccountBase(BaseModel):
    name: str
    icon_key: str = "wallet"
    color: str = "#4ecdc4"
    initial_balance: float = 0


class AccountCreate(AccountBase):
    client_id: str | None = None


class AccountUpdate(BaseModel):
    name: str | None = None
    icon_key: str | None = None
    color: str | None = None
    initial_balance: float | None = None


class AccountResponse(AccountBase, TimestampMixin):
    balance: float = 0

    model_config = {"from_attributes": True}


class CategoryBase(BaseModel):
    name: str
    type: str
    color: str = "#4ecdc4"
    icon_type: str = "preset"
    icon_key: str | None = None
    icon_storage_key: str | None = None
    sort_order: int = 0


class CategoryCreate(CategoryBase):
    client_id: str | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    color: str | None = None
    icon_type: str | None = None
    icon_key: str | None = None
    icon_storage_key: str | None = None
    sort_order: int | None = None


class CategoryResponse(CategoryBase, TimestampMixin):
    model_config = {"from_attributes": True}


class LabelBase(BaseModel):
    name: str


class LabelCreate(LabelBase):
    client_id: str | None = None


class LabelResponse(LabelBase, TimestampMixin):
    model_config = {"from_attributes": True}


class TransactionBase(BaseModel):
    account_id: str
    category_id: str
    type: str
    amount: float
    date: DateType
    comment: str | None = None
    label_ids: list[str] = Field(default_factory=list)


class TransactionCreate(TransactionBase):
    client_id: str | None = None


class TransactionUpdate(BaseModel):
    account_id: str | None = None
    category_id: str | None = None
    type: str | None = None
    amount: float | None = None
    date: DateType | None = None
    comment: str | None = None
    label_ids: list[str] | None = None


class AttachmentResponse(BaseModel):
    id: str
    client_id: str
    storage_key: str | None
    thumbnail_key: str | None
    mime_type: str
    upload_status: str

    model_config = {"from_attributes": True}


class TransactionResponse(TransactionBase, TimestampMixin):
    labels: list[LabelResponse] = Field(default_factory=list)
    attachments: list[AttachmentResponse] = Field(default_factory=list)
    category: CategoryResponse | None = None
    account: AccountResponse | None = None

    model_config = {"from_attributes": True}


class TransferBase(BaseModel):
    from_account_id: str
    to_account_id: str
    amount: float
    date: DateType
    comment: str | None = None


class TransferCreate(TransferBase):
    client_id: str | None = None


class TransferResponse(TransferBase, TimestampMixin):
    model_config = {"from_attributes": True}


class RecurringPaymentBase(BaseModel):
    account_id: str
    category_id: str
    type: str = "expense"
    amount: float
    frequency: str
    next_run_at: datetime
    comment: str | None = None
    label_ids: list[str] = Field(default_factory=list)
    label_names: str | None = None
    active: bool = True


class RecurringPaymentCreate(RecurringPaymentBase):
    client_id: str | None = None


class RecurringPaymentUpdate(BaseModel):
    account_id: str | None = None
    category_id: str | None = None
    type: str | None = None
    amount: float | None = None
    frequency: str | None = None
    next_run_at: datetime | None = None
    comment: str | None = None
    label_ids: list[str] | None = None
    active: bool | None = None


class RecurringPaymentResponse(RecurringPaymentBase, TimestampMixin):
    @field_validator("label_ids", mode="before")
    @classmethod
    def parse_label_ids(cls, value):
        if value is None:
            return []
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return parsed if isinstance(parsed, list) else []
            except json.JSONDecodeError:
                return []
        return []

    model_config = {"from_attributes": True}


class ReminderBase(BaseModel):
    title: str
    due_at: datetime
    recurrence: str | None = None
    notes: str | None = None
    recurring_payment_id: str | None = None
    payload: str | None = None


class ReminderCreate(ReminderBase):
    client_id: str | None = None


class ReminderUpdate(BaseModel):
    title: str | None = None
    due_at: datetime | None = None
    recurrence: str | None = None
    notes: str | None = None
    recurring_payment_id: str | None = None
    payload: str | None = None
    completed_at: datetime | None = None


class ReminderResponse(ReminderBase, TimestampMixin):
    completed_at: datetime | None = None
    model_config = {"from_attributes": True}


class CategorySummary(BaseModel):
    category_id: str
    category_name: str
    color: str
    icon_type: str
    icon_key: str | None
    icon_storage_key: str | None
    total: float
    percentage: float


class AnalyticsSummary(BaseModel):
    total: float
    by_category: list[CategorySummary]


class SyncPushRequest(BaseModel):
    mutations: list["SyncMutation"] = Field(default_factory=list)


class SyncMutation(BaseModel):
    entity: str  # account | category | label | transaction | transfer | recurring | reminder
    op: str  # create | update | delete
    client_id: str
    payload: dict | None = None


class SyncEntityMapping(BaseModel):
    entity: str
    client_id: str
    server_id: str


class SyncPushResponse(BaseModel):
    mappings: list[SyncEntityMapping] = Field(default_factory=list)
    server_time: datetime


class SyncPullResponse(BaseModel):
    accounts: list[AccountResponse] = Field(default_factory=list)
    categories: list[CategoryResponse] = Field(default_factory=list)
    labels: list[LabelResponse] = Field(default_factory=list)
    transactions: list[TransactionResponse] = Field(default_factory=list)
    transfers: list[TransferResponse] = Field(default_factory=list)
    recurring: list[RecurringPaymentResponse] = Field(default_factory=list)
    reminders: list[ReminderResponse] = Field(default_factory=list)
    server_time: datetime
