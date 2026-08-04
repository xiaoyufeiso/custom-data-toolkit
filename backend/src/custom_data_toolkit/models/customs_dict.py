from datetime import datetime
from enum import StrEnum
import re

from sqlmodel import Field, SQLModel, UniqueConstraint

DICT_TEXT_MAX_LENGTH = 255
SYNC_ERROR_MAX_LENGTH = 512
DICT_TYPE_CODE_MAX_LENGTH = 32
DICT_TYPE_CODE_PATTERN = re.compile(r"^[a-z][a-z0-9_]{0,31}$")

# 迁移种子与兼容常量（校验以 DB 为准）
SEED_DICT_TYPES = (
    ("country", "国家"),
    ("continent", "洲"),
)


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


def normalize_dict_type_code(value: str) -> str:
    return value.strip().lower()


def validate_dict_type_code_format(code: str) -> str:
    cleaned = normalize_dict_type_code(code)
    if not cleaned or not DICT_TYPE_CODE_PATTERN.fullmatch(cleaned):
        raise ValueError(
            "dict type code must be 1-32 chars: start with a-z, then a-z0-9_"
        )
    return cleaned


class CustomsDictType(SQLModel, table=True):
    __tablename__ = "customs_dict_type"

    id: int | None = Field(default=None, primary_key=True)
    code: str = Field(max_length=DICT_TYPE_CODE_MAX_LENGTH, unique=True, index=True)
    name: str = Field(max_length=DICT_TEXT_MAX_LENGTH)
    enabled: bool = Field(default=True)
    created_by: int | None = Field(default=None, foreign_key="admin_users.id")
    updated_by: int | None = Field(default=None, foreign_key="admin_users.id")
    created_at: datetime
    updated_at: datetime


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
