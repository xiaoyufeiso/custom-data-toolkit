from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class PublicRateItem(CamelModel):
    currency_code: str = Field(alias="currencyCode")
    date: date
    data: str
    checked: bool


class PublicRateListResponse(CamelModel):
    items: list[PublicRateItem]
