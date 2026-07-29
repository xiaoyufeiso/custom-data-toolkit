from sqlmodel import Session, select

from custom_data_toolkit.models import AdminSession, AdminUser


class AuthRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_user_by_username(self, username: str) -> AdminUser | None:
        statement = select(AdminUser).where(AdminUser.username == username)
        return self.session.exec(statement).first()

    def get_user_by_id(self, user_id: int) -> AdminUser | None:
        return self.session.get(AdminUser, user_id)

    def count_users(self) -> int:
        statement = select(AdminUser)
        return len(list(self.session.exec(statement).all()))

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

    def commit(self) -> None:
        self.session.commit()

    def refresh(self, obj: object) -> None:
        self.session.refresh(obj)
