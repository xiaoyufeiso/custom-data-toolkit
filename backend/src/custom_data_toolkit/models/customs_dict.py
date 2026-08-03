from datetime import datetime
from enum import StrEnum

from sqlmodel import Field, SQLModel, UniqueConstraint

DICT_TEXT_MAX_LENGTH = 255
SYNC_ERROR_MAX_LENGTH = 512


class CustomsDictType(StrEnum):
    COUNTRY = "country"
    CONTINENT = "continent"


class CustomsDictSource(StrEnum):
    MANUAL = "manual"
    MISSING = "missing"
    IMPORT = "import"


class CustomsDictSyncStatus(StrEnum):
    SYNCED = "synced"
    PENDING = "pending"
    FAILED = "failed"


def normalize_dict_text(value: str) -> str:
    """Trim leading/trailing spaces; do not change case or internal whitespace."""
    return value.strip()


def assert_dict_type(dict_type: str) -> CustomsDictType:
    try:
        return CustomsDictType(dict_type)
    except ValueError as exc:
        raise ValueError(f"unsupported dict_type: {dict_type}") from exc


class CustomsDictMapping(SQLModel, table=True):
    __tablename__ = "customs_dict_mapping"
    __table_args__ = (
        UniqueConstraint("dict_type", "raw_value", name="uq_customs_dict_type_raw"),
    )

    id: int | None = Field(default=None, primary_key=True)
    dict_type: str = Field(max_length=32, index=True)
    raw_value: str = Field(max_length=DICT_TEXT_MAX_LENGTH)
    standard_value: str = Field(max_length=DICT_TEXT_MAX_LENGTH)
    enabled: bool = Field(default=True)
    source: str = Field(max_length=32, default=CustomsDictSource.MANUAL.value)
    sync_status: str = Field(max_length=32, default=CustomsDictSyncStatus.PENDING.value)
    sync_error: str | None = Field(default=None, max_length=SYNC_ERROR_MAX_LENGTH)
    last_synced_at: datetime | None = Field(default=None)
    created_by: int | None = Field(default=None, foreign_key="admin_users.id")
    updated_by: int | None = Field(default=None, foreign_key="admin_users.id")
    created_at: datetime
    updated_at: datetime
