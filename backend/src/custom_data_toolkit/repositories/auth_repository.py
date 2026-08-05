from sqlmodel import Session, col, func, select

from custom_data_toolkit.models import AdminSession, AdminUser
from custom_data_toolkit.models.admin import AdminRole


class AuthRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_user_by_username(self, username: str) -> AdminUser | None:
        statement = select(AdminUser).where(AdminUser.username == username)
        return self.session.exec(statement).first()

    def get_user_by_id(self, user_id: int) -> AdminUser | None:
        return self.session.get(AdminUser, user_id)

    def get_user_by_id_for_update(self, user_id: int) -> AdminUser | None:
        statement = (
            select(AdminUser)
            .where(AdminUser.id == user_id)
            .with_for_update()
        )
        return self.session.exec(statement).first()

    def count_users(self) -> int:
        statement = select(func.count()).select_from(AdminUser)
        return int(self.session.exec(statement).one())

    def count_enabled_admins(self, *, exclude_user_id: int | None = None) -> int:
        statement = (
            select(func.count())
            .select_from(AdminUser)
            .where(
                AdminUser.role == AdminRole.ADMIN.value,
                AdminUser.enabled.is_(True),  # type: ignore[union-attr]
            )
        )
        if exclude_user_id is not None:
            statement = statement.where(AdminUser.id != exclude_user_id)
        return int(self.session.exec(statement).one())

    def lock_enabled_admins(self) -> list[AdminUser]:
        """按 id 升序锁定全部启用 admin，避免并发互停绕过 LastAdmin。"""
        statement = (
            select(AdminUser)
            .where(
                AdminUser.role == AdminRole.ADMIN.value,
                AdminUser.enabled.is_(True),  # type: ignore[union-attr]
            )
            .order_by(col(AdminUser.id).asc())
            .with_for_update()
        )
        return list(self.session.exec(statement).all())

    def list_users_page(
        self,
        *,
        q: str | None,
        role: str | None,
        enabled: bool | None,
        page: int,
        page_size: int,
    ) -> tuple[list[AdminUser], int]:
        statement = select(AdminUser)
        count_statement = select(func.count()).select_from(AdminUser)
        if q:
            pattern = f"%{q}%"
            condition = col(AdminUser.username).like(pattern)
            statement = statement.where(condition)
            count_statement = count_statement.where(condition)
        if role:
            statement = statement.where(AdminUser.role == role)
            count_statement = count_statement.where(AdminUser.role == role)
        if enabled is not None:
            statement = statement.where(AdminUser.enabled.is_(enabled))  # type: ignore[union-attr]
            count_statement = count_statement.where(
                AdminUser.enabled.is_(enabled),  # type: ignore[union-attr]
            )
        total = int(self.session.exec(count_statement).one())
        statement = (
            statement.order_by(col(AdminUser.id).desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(self.session.exec(statement).all()), total

    def add_user(self, user: AdminUser) -> AdminUser:
        self.session.add(user)
        self.session.flush()
        return user

    def add_session(self, session_row: AdminSession) -> AdminSession:
        self.session.add(session_row)
        self.session.flush()
        return session_row

    def get_session_by_token_hash(self, token_hash: str) -> AdminSession | None:
        statement = select(AdminSession).where(AdminSession.session_token_hash == token_hash)
        return self.session.exec(statement).first()

    def delete_session(self, session_row: AdminSession) -> None:
        self.session.delete(session_row)

    def delete_other_sessions(self, user_id: int, keep_session_id: int) -> None:
        statement = select(AdminSession).where(
            AdminSession.user_id == user_id,
            AdminSession.id != keep_session_id,
        )
        for row in self.session.exec(statement).all():
            self.session.delete(row)

    def delete_all_sessions_for_user(self, user_id: int) -> None:
        statement = select(AdminSession).where(AdminSession.user_id == user_id)
        for row in self.session.exec(statement).all():
            self.session.delete(row)

    def commit(self) -> None:
        self.session.commit()

    def refresh(self, obj: object) -> None:
        self.session.refresh(obj)
