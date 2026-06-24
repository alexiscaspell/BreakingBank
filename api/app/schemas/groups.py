from datetime import datetime

from pydantic import BaseModel, Field


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class GroupMemberAdd(BaseModel):
    email: str
    role: str = "editor"


class GroupMemberResponse(BaseModel):
    id: str
    user_id: str
    username: str
    email: str
    role: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class GroupResponse(BaseModel):
    id: str
    name: str
    created_by: str
    role: str
    member_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ActiveGroupUpdate(BaseModel):
    group_id: str
