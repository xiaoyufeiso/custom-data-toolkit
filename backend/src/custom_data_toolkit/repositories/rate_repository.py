from datetime import date

from sqlmodel import Session, col, func, select

from custom_data_toolkit.models import Currency, Rate


class RateRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_page(
        self,
        *,
        currency_id: int | None,
        code: str | None,
        on_date: date | None,
        date_from: date | None,
        date_to: date | None,
        checked: bool | None,
        sort_order: str,
        page: int,
        page_size: int,
    ) -> tuple[list[tuple[Rate, Currency]], int]:
        statement = select(Rate, Currency).join(Currency, Rate.currency_id == Currency.id)
        count_statement = (
            select(func.count())
            .select_from(Rate)
            .join(Currency, Rate.currency_id == Currency.id)
        )

        if currency_id is not None:
            statement = statement.where(Rate.currency_id == currency_id)
            count_statement = count_statement.where(Rate.currency_id == currency_id)
        if code is not None:
            statement = statement.where(Currency.code == code)
            count_statement = count_statement.where(Currency.code == code)
        if on_date is not None:
            statement = statement.where(Rate.date == on_date)
            count_statement = count_statement.where(Rate.date == on_date)
        if date_from is not None:
            statement = statement.where(col(Rate.date) >= date_from)
            count_statement = count_statement.where(col(Rate.date) >= date_from)
        if date_to is not None:
            statement = statement.where(col(Rate.date) <= date_to)
            count_statement = count_statement.where(col(Rate.date) <= date_to)
        if checked is not None:
            statement = statement.where(Rate.checked == checked)
            count_statement = count_statement.where(Rate.checked == checked)

        total = int(self.session.exec(count_statement).one())
        if sort_order == "asc":
            statement = statement.order_by(col(Rate.date).asc(), col(Rate.id).asc())
        else:
            statement = statement.order_by(col(Rate.date).desc(), col(Rate.id).desc())
        statement = statement.offset((page - 1) * page_size).limit(page_size)
        rows = list(self.session.exec(statement).all())
        return rows, total

    def get_by_id(self, rate_id: int) -> tuple[Rate, Currency] | None:
        statement = (
            select(Rate, Currency)
            .join(Currency, Rate.currency_id == Currency.id)
            .where(Rate.id == rate_id)
        )
        return self.session.exec(statement).first()

    def get_currency(self, currency_id: int) -> Currency | None:
        return self.session.get(Currency, currency_id)

    def get_currency_by_code(self, code: str) -> Currency | None:
        statement = select(Currency).where(Currency.code == code)
        return self.session.exec(statement).first()

    def get_by_currency_date(self, currency_id: int, on_date: date) -> Rate | None:
        statement = select(Rate).where(
            Rate.currency_id == currency_id,
            Rate.date == on_date,
        )
        return self.session.exec(statement).first()

    def list_by_currency_date_filter(
        self,
        *,
        currency_id: int,
        on_date: date | None,
        date_from: date | None,
        date_to: date | None,
    ) -> list[Rate]:
        statement = select(Rate).where(Rate.currency_id == currency_id)
        if on_date is not None:
            statement = statement.where(Rate.date == on_date)
        if date_from is not None:
            statement = statement.where(col(Rate.date) >= date_from)
        if date_to is not None:
            statement = statement.where(col(Rate.date) <= date_to)
        statement = statement.order_by(col(Rate.date).desc(), col(Rate.id).desc())
        return list(self.session.exec(statement).all())

    def add(self, rate: Rate) -> Rate:
        self.session.add(rate)
        self.session.flush()
        return rate

    def delete(self, rate: Rate) -> None:
        self.session.delete(rate)

    def commit(self) -> None:
        self.session.commit()

    def refresh(self, obj: object) -> None:
        self.session.refresh(obj)
