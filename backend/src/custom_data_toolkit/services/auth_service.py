from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from custom_data_toolkit.config.settings import settings
from custom_data_toolkit.middleware.error_handler import (
    LoginFailedException,
    UnauthorizedException,
)
from custom_data_toolkit.models import AdminSession, AdminUser
from custom_data_toolkit.repositories import AuthRepository
from custom_data_toolkit.security import (
    digest_equal,
    hash_password,
    new_token,
    sha256_hex,
    verify_password,
)


@dataclass
class SessionIssue:
    user: AdminUser
    session_token: str
    csrf_token: str


@dataclass
class AuthContext:
    user: AdminUser
    session: AdminSession


class AuthService:
    def __init__(self, repository: AuthRepository) -> None:
        self.repository = repository

    def ensure_bootstrap_admin(self) -> None:
        if self.repository.count_users() > 0:
            return
        now = datetime.now(UTC).replace(tzinfo=None)
        user = AdminUser(
            username=settings.admin_bootstrap_username.strip(),
            password_hash=hash_password(settings.admin_bootstrap_password),
            created_at=now,
            updated_at=now,
        )
        self.repository.add_user(user)
        self.repository.commit()

    def login(self, username: str, password: str) -> SessionIssue:
        cleaned = username.strip()
        user = self.repository.get_user_by_username(cleaned)
        ok = bool(user and verify_password(user.password_hash, password))
        if not ok:
            raise LoginFailedException()
        assert user is not None
        return self._create_session_issue(user)

    def logout(self, session_row: AdminSession) -> None:
        self.repository.delete_session(session_row)
        self.repository.commit()

    def resolve_session(self, session_token: str | None) -> AuthContext:
        if not session_token:
            raise UnauthorizedException()
        session_row = self.repository.get_session_by_token_hash(sha256_hex(session_token))
        if session_row is None:
            raise UnauthorizedException()
        now = datetime.now(UTC).replace(tzinfo=None)
        if session_row.expires_at < now:
            self.repository.delete_session(session_row)
            self.repository.commit()
            raise UnauthorizedException()
        user = self.repository.get_user_by_id(session_row.user_id)
        if user is None:
            raise UnauthorizedException()
        return AuthContext(user=user, session=session_row)

    def rotate_csrf(self, session_row: AdminSession) -> str:
        csrf_token = new_token()
        session_row.csrf_secret_hash = sha256_hex(csrf_token)
        self.repository.commit()
        return csrf_token

    def change_password(
        self,
        *,
        user: AdminUser,
        session_row: AdminSession,
        current_password: str,
        new_password: str,
    ) -> None:
        if not verify_password(user.password_hash, current_password):
            raise LoginFailedException("当前密码不正确。")
        user.password_hash = hash_password(new_password)
        user.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self.repository.delete_other_sessions(user.id, session_row.id)  # type: ignore[arg-type]
        self.repository.commit()

    def _create_session_issue(self, user: AdminUser) -> SessionIssue:
        session_token = new_token()
        csrf_token = new_token()
        now = datetime.now(UTC).replace(tzinfo=None)
        session_row = AdminSession(
            user_id=user.id,  # type: ignore[arg-type]
            session_token_hash=sha256_hex(session_token),
            csrf_secret_hash=sha256_hex(csrf_token),
            expires_at=now + timedelta(seconds=settings.session_ttl_seconds),
            created_at=now,
        )
        self.repository.add_session(session_row)
        self.repository.commit()
        self.repository.refresh(user)
        return SessionIssue(user=user, session_token=session_token, csrf_token=csrf_token)

    @staticmethod
    def verify_session_csrf(session_row: AdminSession, csrf_token: str | None) -> bool:
        if not csrf_token:
            return False
        return digest_equal(session_row.csrf_secret_hash, sha256_hex(csrf_token))
