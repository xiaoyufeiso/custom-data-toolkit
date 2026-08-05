from datetime import datetime
from enum import Enum

from sqlmodel import Field, SQLModel


class AdminRole(str, Enum):
    ADMIN = "admin"
    VIEWER = "viewer"


class AdminUser(SQLModel, table=True):
    __tablename__ = "admin_users"

    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(max_length=64, unique=True, index=True)
    password_hash: str = Field(max_length=255)
    role: str = Field(default=AdminRole.ADMIN.value, max_length=32)
    enabled: bool = Field(default=True)
    created_at: datetime
    updated_at: datetime


class AdminSession(SQLModel, table=True):
    __tablename__ = "admin_sessions"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="admin_users.id", index=True)
    session_token_hash: str = Field(max_length=255, unique=True, index=True)
    csrf_secret_hash: str = Field(max_length=255)
    expires_at: datetime
    created_at: datetime


class ApiKey(SQLModel, table=True):
    __tablename__ = "api_keys"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)
    key_prefix: str = Field(max_length=16)
    key_hash: str = Field(max_length=255, unique=True, index=True)
    enabled: bool = Field(default=True)
    created_by: int | None = Field(default=None, foreign_key="admin_users.id")
    created_at: datetime
    updated_at: datetime


class AdminAuditLog(SQLModel, table=True):
    __tablename__ = "admin_audit_log"

    id: int | None = Field(default=None, primary_key=True)
    actor_user_id: int | None = Field(default=None, index=True)
    actor_username: str = Field(max_length=64, index=True)
    action: str = Field(max_length=64, index=True)
    resource_type: str = Field(max_length=64, index=True)
    resource_ids: str = Field(default="", max_length=2000)
    summary: str = Field(default="{}", max_length=4000)
    created_at: datetime = Field(index=True)
