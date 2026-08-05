from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class AuditLogPublic(CamelModel):
    id: int
    actor_user_id: int | None = Field(alias="actorUserId")
    actor_username: str = Field(alias="actorUsername")
    action: str
    resource_type: str = Field(alias="resourceType")
    resource_ids: str = Field(alias="resourceIds")
    summary: dict[str, Any]
    created_at: datetime = Field(alias="createdAt")

    @field_validator("summary", mode="before")
    @classmethod
    def parse_summary(cls, value: Any) -> dict[str, Any]:
        if value is None or value == "":
            return {}
        if isinstance(value, dict):
            return value
        if isinstance(value, str):
            import json

            try:
                parsed = json.loads(value)
            except json.JSONDecodeError:
                return {"raw": value}
            return parsed if isinstance(parsed, dict) else {"value": parsed}
        return {"value": value}


class AuditLogListResponse(CamelModel):
    items: list[AuditLogPublic]
    page: int
    page_size: int = Field(alias="pageSize")
    total: int
