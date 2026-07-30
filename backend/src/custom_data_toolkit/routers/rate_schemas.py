from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class RatePublic(CamelModel):
    id: int
    currency_id: int = Field(alias="currencyId")
    currency_code: str | None = Field(default=None, alias="currencyCode")
    currency_name: str = Field(alias="currencyName")
    date: date
    data: str
    checked: bool
    create_time: datetime = Field(alias="createTime")
    update_time: datetime = Field(alias="updateTime")


class RateCreateRequest(CamelModel):
    currency_id: int = Field(alias="currencyId")
    date: date
    data: str
    checked: bool = False


class RateUpdateRequest(CamelModel):
    data: str | None = None
    checked: bool | None = None


class RateListResponse(CamelModel):
    items: list[RatePublic]
    page: int
    page_size: int = Field(alias="pageSize")
    total: int
