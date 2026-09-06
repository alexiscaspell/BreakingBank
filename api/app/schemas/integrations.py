from datetime import date, datetime

from pydantic import BaseModel, Field


class CounterpartyPayload(BaseModel):
    cbu: str | None = None
    cvu: str | None = None
    alias: str | None = None
    name: str | None = None
    cuit: str | None = None


class IngestEvent(BaseModel):
    source: str
    external_id: str | None = None
    amount: float | None = None
    currency: str = "ARS"
    occurred_at: datetime | None = None
    direction: str = "out"  # out | in
    counterparty: CounterpartyPayload = Field(default_factory=CounterpartyPayload)
    android_package: str | None = None
    raw: dict = Field(default_factory=dict)


class NotificationIngestRequest(BaseModel):
    android_package: str
    title: str | None = None
    text: str | None = None
    posted_at: datetime | None = None



class IntegrationSourceUpdate(BaseModel):
    default_account_id: str | None = None
    enabled: bool | None = None


class IntegrationSourceResponse(BaseModel):
    id: str
    client_id: str
    key: str
    display_name: str
    android_package: str
    default_account_id: str | None = None
    enabled: bool
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    model_config = {"from_attributes": True}


class CounterpartyRuleCreate(BaseModel):
    client_id: str | None = None
    match_type: str
    match_value: str
    category_id: str
    transaction_type: str = "expense"
    priority: int = 100
    enabled: bool = True


class CounterpartyRuleUpdate(BaseModel):
    match_type: str | None = None
    match_value: str | None = None
    category_id: str | None = None
    transaction_type: str | None = None
    priority: int | None = None
    enabled: bool | None = None


class CounterpartyRuleResponse(BaseModel):
    id: str
    client_id: str
    match_type: str
    match_value: str
    category_id: str
    transaction_type: str
    priority: int
    enabled: bool
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    model_config = {"from_attributes": True}


class PendingImportResponse(BaseModel):
    id: str
    client_id: str
    source: str
    external_id: str
    amount: float | None = None
    currency: str = "ARS"
    occurred_on: date | None = None
    direction: str = "out"
    counterparty_cbu: str | None = None
    counterparty_cvu: str | None = None
    counterparty_alias: str | None = None
    counterparty_name: str | None = None
    counterparty_cuit: str | None = None
    suggested_account_id: str | None = None
    suggested_category_id: str | None = None
    match_type: str | None = None
    confidence: float = 0
    status: str
    raw_payload: str | None = None
    comment: str | None = None
    transaction_id: str | None = None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    model_config = {"from_attributes": True}


class PendingImportAccept(BaseModel):
    account_id: str | None = None
    category_id: str | None = None
    amount: float | None = None
    type: str | None = None
    comment: str | None = None
    date: date | None = None
    learn_rule: bool = False
    learn_match_type: str | None = None  # alias | cbu | cvu | cuit | contains
    learn_match_value: str | None = None


class IngestResult(BaseModel):
    status: str
    pending_import_id: str | None = None
    transaction_id: str | None = None
    pending: PendingImportResponse | None = None
    message: str | None = None


class IntegrationTokenResponse(BaseModel):
    token: str
