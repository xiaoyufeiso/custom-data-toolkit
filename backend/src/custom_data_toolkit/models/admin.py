from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class AdminUser(SQLModel, table=True):
    __tablename__ = "admin_users"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(max_length=64, unique=True, index=True)
    password_hash: str = Field(max_length=255)
    created_at: datetime
    updated_at: datetime


class AdminSession(SQLModel, table=True):
    __tablename__ = "admin_sessions"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="admin_users.id", index=True)
    session_token_hash: str = Field(max_length=255, unique=True, index=True)
    csrf_secret_hash: str = Field(max_length=255)
    expires_at: datetime
    created_at: datetime


class ApiKey(SQLModel, table=True):
    __tablename__ = "api_keys"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)
    key_prefix: str = Field(max_length=16)
    key_hash: str = Field(max_length=255, unique=True, index=True)
    enabled: bool = Field(default=True)
    created_by: Optional[int] = Field(default=None, foreign_key="admin_users.id")
    created_at: datetime
    updated_at: datetime
