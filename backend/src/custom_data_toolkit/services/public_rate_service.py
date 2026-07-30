from __future__ import annotations

import re
from datetime import date

from custom_data_toolkit.middleware.error_handler import AppException, NotFoundException
from custom_data_toolkit.models import Rate
from custom_data_toolkit.repositories.rate_repository import RateRepository

_CODE_RE = re.compile(r"^[A-Z_]{1,10}$")


class PublicRateService:
    def __init__(self, repository: RateRepository) -> None:
        self.repository = repository

    def query(
        self,
        *,
        code: str,
        on_date: date | None,
        date_from: date | None,
        date_to: date | None,
    ) -> tuple[str, list[Rate]]:
        cleaned_code = code.strip()
        if not cleaned_code:
            raise AppException("请填写货币代码。")
        cleaned_code = cleaned_code.upper()
        if not _CODE_RE.fullmatch(cleaned_code):
            raise AppException("货币代码须为 1~10 位字母或下划线，例如 CNY。")
        if on_date is not None and (date_from is not None or date_to is not None):
            raise AppException("请使用单日查询，或起始/结束日期区间，不要同时填写。")
        if on_date is None and (date_from is None or date_to is None):
            raise AppException("请提供单日日期，或同时提供起始日期与结束日期。")
        if date_from is not None and date_to is not None and date_from > date_to:
            raise AppException("起始日期不能晚于结束日期。")

        currency = self.repository.get_currency_by_code(cleaned_code)
        if currency is None:
            raise NotFoundException("未找到该货币代码。", error_code="Currency.NotFound")

        rows = self.repository.list_by_currency_date_filter(
            currency_id=currency.id,  # type: ignore[arg-type]
            on_date=on_date,
            date_from=date_from,
            date_to=date_to,
        )
        return cleaned_code, rows
