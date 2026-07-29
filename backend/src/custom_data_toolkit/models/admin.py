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
