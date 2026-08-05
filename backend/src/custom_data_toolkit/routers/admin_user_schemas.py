from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class AdminUserPublic(CamelModel):
    id: int
    username: str
    role: str
    enabled: bool
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class AdminUserListResponse(CamelModel):
    items: list[AdminUserPublic]
    page: int
    page_size: int = Field(alias="pageSize")
    total: int


class AdminUserCreateRequest(CamelModel):
    username: str
    password: str
    role: str = "viewer"


class AdminUserUpdateRequest(CamelModel):
    role: str | None = None
    enabled: bool | None = None


class AdminUserResetPasswordRequest(CamelModel):
    password: str
