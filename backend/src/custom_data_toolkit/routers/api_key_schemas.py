from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class ApiKeyPublic(CamelModel):
    id: int
    name: str
    key_prefix: str = Field(alias="keyPrefix")
    enabled: bool
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class ApiKeyCreateRequest(CamelModel):
    name: str


class ApiKeyCreateResponse(ApiKeyPublic):
    key: str


class ApiKeyUpdateRequest(CamelModel):
    name: str | None = None
    enabled: bool | None = None
