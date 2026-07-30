from datetime import date, datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Currency(SQLModel, table=True):
    __tablename__ = "currency"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)
    code: Optional[str] = Field(default=None, max_length=10)


class Rate(SQLModel, table=True):
    """既有汇率表映射（currency_id + date 唯一）。"""

    __tablename__ = "rate"

    id: Optional[int] = Field(default=None, primary_key=True)
    data: str = Field(max_length=50)
    date: date
    create_time: datetime
    update_time: datetime
    checked: bool = Field(default=False)
    currency_id: int = Field(foreign_key="currency.id", index=True)
