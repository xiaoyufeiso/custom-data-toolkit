from __future__ import annotations

from datetime import UTC, datetime

from custom_data_toolkit.middleware.error_handler import (
    AppException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from custom_data_toolkit.models import AdminUser
from custom_data_toolkit.models.admin import AdminRole
from custom_data_toolkit.repositories import AuthRepository
from custom_data_toolkit.security import hash_password

USERNAME_MIN = 3
USERNAME_MAX = 64
PASSWORD_MIN = 8


class AdminUserService:
    def __init__(self, repository: AuthRepository) -> None:
        self.repository = repository

    def require_admin(self, actor: AdminUser) -> None:
        if actor.role != AdminRole.ADMIN.value or not actor.enabled:
            raise ForbiddenException()

    def list_page(
        self,
        *,
        q: str | None,
        role: str | None,
        enabled: bool | None,
        page: int,
        page_size: int,
    ) -> tuple[list[AdminUser], int]:
        cleaned_q = q.strip() if q else None
        if cleaned_q == "":
            cleaned_q = None
        cleaned_role = self._normalize_role(role) if role else None
        return self.repository.list_users_page(
            q=cleaned_q,
            role=cleaned_role,
            enabled=enabled,
            page=page,
            page_size=page_size,
        )

    def create(
        self,
        *,
        username: str,
        password: str,
        role: str,
    ) -> AdminUser:
        cleaned_username = self._require_username(username)
        cleaned_password = self._require_password(password)
        cleaned_role = self._normalize_role(role)
        if self.repository.get_user_by_username(cleaned_username) is not None:
            raise ConflictException(
                "用户名已存在。",
                error_code="AdminUser.DuplicateUsername",
            )
        now = datetime.now(UTC).replace(tzinfo=None)
        user = AdminUser(
            username=cleaned_username,
            password_hash=hash_password(cleaned_password),
            role=cleaned_role,
            enabled=True,
            created_at=now,
            updated_at=now,
        )
        self.repository.add_user(user)
        self.repository.commit()
        self.repository.refresh(user)
        return user

    def update(
        self,
        *,
        user_id: int,
        actor_id: int,
        role: str | None,
        enabled: bool | None,
    ) -> AdminUser:
        user = self.repository.get_user_by_id(user_id)
        if user is None:
            raise NotFoundException("用户不存在。", error_code="AdminUser.NotFound")

        next_role = self._normalize_role(role) if role is not None else user.role
        next_enabled = user.enabled if enabled is None else enabled

        if user_id == actor_id and next_enabled is False:
            raise AppException(
                "不能停用当前登录账号。",
                error_code="AdminUser.CannotDisableSelf",
            )

        becoming_non_admin = (
            user.role == AdminRole.ADMIN.value
            and user.enabled
            and (
                next_role != AdminRole.ADMIN.value
                or next_enabled is False
            )
        )
        if becoming_non_admin:
            # 按 id 升序锁全部启用 admin，检查与更新同事务，防并发互停
            enabled_admins = self.repository.lock_enabled_admins()
            if len(enabled_admins) <= 1:
                raise ConflictException(
                    "不能停用或降级最后一个启用的管理员。",
                    error_code="AdminUser.LastAdmin",
                )
            locked = next((row for row in enabled_admins if row.id == user_id), None)
            if locked is None:
                raise ConflictException(
                    "不能停用或降级最后一个启用的管理员。",
                    error_code="AdminUser.LastAdmin",
                )
            user = locked
        else:
            user = self.repository.get_user_by_id_for_update(user_id)
            if user is None:
                raise NotFoundException("用户不存在。", error_code="AdminUser.NotFound")

        user.role = next_role
        was_enabled = user.enabled
        user.enabled = next_enabled
        user.updated_at = datetime.now(UTC).replace(tzinfo=None)
        if was_enabled and not next_enabled:
            self.repository.delete_all_sessions_for_user(user_id)
        self.repository.commit()
        self.repository.refresh(user)
        return user

    def reset_password(self, *, user_id: int, new_password: str) -> None:
        user = self.repository.get_user_by_id(user_id)
        if user is None:
            raise NotFoundException("用户不存在。", error_code="AdminUser.NotFound")
        cleaned = self._require_password(new_password)
        user.password_hash = hash_password(cleaned)
        user.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self.repository.delete_all_sessions_for_user(user_id)
        self.repository.commit()

    def _require_username(self, username: str) -> str:
        cleaned = username.strip()
        if len(cleaned) < USERNAME_MIN or len(cleaned) > USERNAME_MAX:
            raise AppException(
                f"用户名长度须为 {USERNAME_MIN}–{USERNAME_MAX} 个字符。",
                error_code="AdminUser.InvalidUsername",
            )
        return cleaned

    def _require_password(self, password: str) -> str:
        if len(password) < PASSWORD_MIN:
            raise AppException(
                f"密码长度至少 {PASSWORD_MIN} 个字符。",
                error_code="AdminUser.InvalidPassword",
            )
        return password

    def _normalize_role(self, role: str) -> str:
        cleaned = role.strip().lower()
        if cleaned not in {AdminRole.ADMIN.value, AdminRole.VIEWER.value}:
            raise AppException(
                "角色无效。",
                error_code="AdminUser.InvalidRole",
            )
        return cleaned
