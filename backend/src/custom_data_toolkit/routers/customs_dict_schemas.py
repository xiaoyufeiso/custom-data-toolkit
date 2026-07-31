from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class CustomsDictMappingPublic(CamelModel):
    id: int
    dict_type: str = Field(alias="dictType")
    raw_value: str = Field(alias="rawValue")
    standard_value: str = Field(alias="standardValue")
    enabled: bool
    source: str
    sync_status: str = Field(alias="syncStatus")
    sync_error: str | None = Field(default=None, alias="syncError")
    last_synced_at: datetime | None = Field(default=None, alias="lastSyncedAt")
    created_by: int | None = Field(default=None, alias="createdBy")
    updated_by: int | None = Field(default=None, alias="updatedBy")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class CustomsDictMappingCreateRequest(CamelModel):
    dict_type: str = Field(alias="dictType")
    raw_value: str = Field(alias="rawValue")
    standard_value: str = Field(alias="standardValue")


class CustomsDictMappingUpdateRequest(CamelModel):
    standard_value: str = Field(alias="standardValue")
    raw_value: str | None = Field(default=None, alias="rawValue")


class CustomsDictMappingListResponse(CamelModel):
    items: list[CustomsDictMappingPublic]
    page: int
    page_size: int = Field(alias="pageSize")
    total: int


class CustomsDictReplaySyncResponse(CamelModel):
    synced: int
    failed: int
    total: int


class CustomsDictMissingPublic(CamelModel):
    dict_type: str = Field(alias="dictType")
    dict_type_label: str = Field(alias="dictTypeLabel")
    raw_value: str = Field(alias="rawValue")
    occurrence_count: int = Field(alias="occurrenceCount")


class CustomsDictMissingListResponse(CamelModel):
    items: list[CustomsDictMissingPublic]
    page: int
    page_size: int = Field(alias="pageSize")
    total: int


class CustomsDictMissingHandleRequest(CamelModel):
    dict_type: str = Field(alias="dictType")
    raw_value: str = Field(alias="rawValue")
    standard_value: str = Field(alias="standardValue")
