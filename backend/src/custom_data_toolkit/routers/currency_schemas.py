from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class CurrencyPublic(CamelModel):
    id: int
    name: str
    code: str | None = None


class CurrencyCreateRequest(CamelModel):
    name: str
    code: str | None = None


class CurrencyUpdateRequest(CamelModel):
    name: str | None = None
    code: str | None = None


class CurrencyListResponse(CamelModel):
    items: list[CurrencyPublic]
    page: int
    page_size: int = Field(alias="pageSize")
    total: int
