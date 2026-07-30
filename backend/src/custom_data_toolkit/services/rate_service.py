from datetime import UTC, date, datetime

from sqlalchemy.exc import IntegrityError

from custom_data_toolkit.middleware.error_handler import (
    AppException,
    ConflictException,
    NotFoundException,
)
from custom_data_toolkit.models import Currency, Rate
from custom_data_toolkit.repositories.rate_repository import RateRepository


class RateService:
    def __init__(self, repository: RateRepository) -> None:
        self.repository = repository

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
        if on_date is not None and (date_from is not None or date_to is not None):
            raise AppException("请使用单日筛选，或起始/结束日期区间，不要同时填写。")
        if (date_from is None) ^ (date_to is None):
            raise AppException("起始日期与结束日期需同时填写。")
        if date_from is not None and date_to is not None and date_from > date_to:
            raise AppException("起始日期不能晚于结束日期。")
        cleaned_code = code.strip() if code else None
        if cleaned_code == "":
            cleaned_code = None
        normalized_sort = sort_order.lower().strip()
        if normalized_sort not in {"asc", "desc"}:
            raise AppException("排序方式仅支持 asc 或 desc。")
        return self.repository.list_page(
            currency_id=currency_id,
            code=cleaned_code,
            on_date=on_date,
            date_from=date_from,
            date_to=date_to,
            checked=checked,
            sort_order=normalized_sort,
            page=page,
            page_size=page_size,
        )

    def get(self, rate_id: int) -> tuple[Rate, Currency]:
        row = self.repository.get_by_id(rate_id)
        if row is None:
            raise NotFoundException("未找到该汇率。")
        return row

    def create(
        self,
        *,
        currency_id: int,
        on_date: date,
        data: str,
        checked: bool,
    ) -> tuple[Rate, Currency]:
        currency = self.repository.get_currency(currency_id)
        if currency is None:
            raise NotFoundException("未找到该货币。")
        cleaned_data = self._normalize_data(data)
        if self.repository.get_by_currency_date(currency_id, on_date) is not None:
            raise ConflictException(
                "该货币在该日期已有汇率，请勿重复创建。",
                error_code="Rate.DuplicateCurrencyDate",
            )
        now = datetime.now(UTC).replace(tzinfo=None)
        rate = Rate(
            currency_id=currency_id,
            date=on_date,
            data=cleaned_data,
            checked=checked,
            create_time=now,
            update_time=now,
        )
        try:
            self.repository.add(rate)
            self.repository.commit()
        except IntegrityError as exc:
            self.repository.session.rollback()
            raise ConflictException(
                "该货币在该日期已有汇率，请勿重复创建。",
                error_code="Rate.DuplicateCurrencyDate",
            ) from exc
        self.repository.refresh(rate)
        return rate, currency

    def update(
        self,
        rate_id: int,
        *,
        data: str | None,
        checked: bool | None,
    ) -> tuple[Rate, Currency]:
        if data is None and checked is None:
            raise AppException("请至少修改汇率值或核对状态其中一项。")
        rate, currency = self.get(rate_id)
        if data is not None:
            rate.data = self._normalize_data(data)
        if checked is not None:
            rate.checked = checked
        rate.update_time = datetime.now(UTC).replace(tzinfo=None)
        self.repository.commit()
        self.repository.refresh(rate)
        return rate, currency

    def delete(self, rate_id: int) -> None:
        rate, _currency = self.get(rate_id)
        self.repository.delete(rate)
        self.repository.commit()

    @staticmethod
    def _normalize_data(data: str) -> str:
        cleaned = data.strip()
        if not cleaned:
            raise AppException("请填写汇率值。")
        if len(cleaned) > 50:
            raise AppException("汇率值最多 50 个字符。")
        return cleaned
