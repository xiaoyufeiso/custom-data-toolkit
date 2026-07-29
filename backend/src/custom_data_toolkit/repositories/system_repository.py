from sqlmodel import Session, text


class SystemRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def is_database_reachable(self) -> bool:
        try:
            self.session.exec(text("SELECT 1"))
        except Exception:
            return False
        return True
