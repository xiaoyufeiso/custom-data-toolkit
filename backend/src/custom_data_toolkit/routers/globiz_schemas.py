from datetime import date

from pydantic import BaseModel


class GlobizCurrency(BaseModel):
    id: int
    name: str
    code: str | None = None


class GlobizRate(BaseModel):
    id: int
    data: str
    currency: str
    date: date


class GlobizCurrencyPage(BaseModel):
    count: int
    next: str | None = None
    previous: str | None = None
    results: list[GlobizCurrency]


class GlobizRatePage(BaseModel):
    count: int
    next: str | None = None
    previous: str | None = None
    results: list[GlobizRate]


class GlobizRootLinks(BaseModel):
    currencies: str
    rates: str
    openapi: str
