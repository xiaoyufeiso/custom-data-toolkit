from sqlalchemy import case
from sqlmodel import Session, col, func, or_, select

from custom_data_toolkit.models import Currency, Rate


class CurrencyRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_page(
        self,
        *,
        q: str | None,
        page: int,
        page_size: int,
    ) -> tuple[list[Currency], int]:
        statement = select(Currency)
        count_statement = select(func.count()).select_from(Currency)
        if q:
            pattern = f"%{q.strip()}%"
            filt = or_(col(Currency.name).like(pattern), col(Currency.code).like(pattern))
            statement = statement.where(filt)
            count_statement = count_statement.where(filt)
        total = int(self.session.exec(count_statement).one())
        statement = (
            statement.order_by(col(Currency.id).desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        items = list(self.session.exec(statement).all())
        return items, total

    def get_by_id(self, currency_id: int) -> Currency | None:
        return self.session.get(Currency, currency_id)

    def list_suggestions(
        self,
        *,
        prefix: str,
        field: str,
        limit: int,
    ) -> list[Currency]:
        normalized_name = func.lower(func.trim(Currency.name))
        normalized_code = func.lower(func.trim(Currency.code))
        escaped_prefix = (
            prefix.lower()
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )
        pattern = f"{escaped_prefix}%"
        code_prefix_match = normalized_code.like(pattern, escape="\\")
        name_prefix_match = normalized_name.like(pattern, escape="\\")
        if field == "code":
            match_filter = code_prefix_match
            rank = case((normalized_code == prefix.lower(), 0), else_=1)
            sort_value = normalized_code
        else:
            match_filter = or_(
                code_prefix_match,
                name_prefix_match,
            )
            rank = case(
                (normalized_code == prefix.lower(), 0),
                (normalized_name == prefix.lower(), 0),
                (code_prefix_match, 1),
                else_=2,
            )
            sort_value = case(
                (normalized_code == prefix.lower(), normalized_code),
                (normalized_name == prefix.lower(), normalized_name),
                (code_prefix_match, normalized_code),
                else_=normalized_name,
            )
        statement = (
            select(Currency)
            .where(match_filter)
            .order_by(
                rank,
                sort_value.asc(),
                normalized_name.asc(),
                col(Currency.id).asc(),
            )
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_by_ids_for_update(self, currency_ids: list[int]) -> list[Currency]:
        statement = (
            select(Currency)
            .where(col(Currency.id).in_(currency_ids))
            .with_for_update()
        )
        return list(self.session.exec(statement).all())

    def get_by_code(self, code: str) -> Currency | None:
        statement = select(Currency).where(Currency.code == code)
        return self.session.exec(statement).first()

    def add(self, currency: Currency) -> Currency:
        self.session.add(currency)
        self.session.flush()
        return currency

    def delete(self, currency: Currency) -> None:
        self.session.delete(currency)

    def count_rates(self, currency_id: int) -> int:
        statement = select(func.count()).select_from(Rate).where(Rate.currency_id == currency_id)
        return int(self.session.exec(statement).one())

    def list_ids_with_rates(self, currency_ids: list[int]) -> list[int]:
        statement = (
            select(Rate.currency_id)
            .where(col(Rate.currency_id).in_(currency_ids))
            .distinct()
        )
        return [int(currency_id) for currency_id in self.session.exec(statement).all()]

    def commit(self) -> None:
        self.session.commit()

    def refresh(self, obj: object) -> None:
        self.session.refresh(obj)
