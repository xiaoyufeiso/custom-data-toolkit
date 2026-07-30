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

    def commit(self) -> None:
        self.session.commit()

    def refresh(self, obj: object) -> None:
        self.session.refresh(obj)
