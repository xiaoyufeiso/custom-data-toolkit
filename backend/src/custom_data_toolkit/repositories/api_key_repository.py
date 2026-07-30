from sqlmodel import Session, col, select

from custom_data_toolkit.models import ApiKey


class ApiKeyRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, row: ApiKey) -> ApiKey:
        self.session.add(row)
        self.session.flush()
        return row

    def list_all(self) -> list[ApiKey]:
        statement = select(ApiKey).order_by(col(ApiKey.id).desc())
        return list(self.session.exec(statement).all())

    def get_by_id(self, key_id: int) -> ApiKey | None:
        return self.session.get(ApiKey, key_id)

    def get_by_hash(self, key_hash: str) -> ApiKey | None:
        statement = select(ApiKey).where(ApiKey.key_hash == key_hash)
        return self.session.exec(statement).first()

    def delete(self, row: ApiKey) -> None:
        self.session.delete(row)

    def commit(self) -> None:
        self.session.commit()

    def refresh(self, obj: object) -> None:
        self.session.refresh(obj)
