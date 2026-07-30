import re

from custom_data_toolkit.middleware.error_handler import (
    AppException,
    ConflictException,
    NotFoundException,
)
from custom_data_toolkit.models import Currency
from custom_data_toolkit.repositories.currency_repository import CurrencyRepository

# 货币码：1~10 位大写字母或下划线（如 CNY、MYR_IM）；库列为 varchar(10)。
_CODE_RE = re.compile(r"^[A-Z_]{1,10}$")


class CurrencyService:
    def __init__(self, repository: CurrencyRepository) -> None:
        self.repository = repository

    def list_page(
        self,
        *,
        q: str | None,
        page: int,
        page_size: int,
    ) -> tuple[list[Currency], int]:
        return self.repository.list_page(q=q, page=page, page_size=page_size)

    def get(self, currency_id: int) -> Currency:
        currency = self.repository.get_by_id(currency_id)
        if currency is None:
            raise NotFoundException("未找到该货币。")
        return currency

    def create(self, *, name: str, code: str | None) -> Currency:
        cleaned_name = name.strip()
        if not cleaned_name:
            raise AppException("请填写货币名称。")
        cleaned_code = self._normalize_code(code)
        self._ensure_code_unique(cleaned_code)
        currency = Currency(name=cleaned_name[:100], code=cleaned_code)
        self.repository.add(currency)
        self.repository.commit()
        self.repository.refresh(currency)
        return currency

    def update(
        self,
        currency_id: int,
        *,
        name: str | None = None,
        code: str | None = None,
        update_name: bool = False,
        update_code: bool = False,
    ) -> Currency:
        """部分更新。

        `update_code=True` 且 `code is None`（或空串规范化后为 None）表示显式清空 code；
        `update_code=False` 表示请求未携带 code，保持原值。
        """
        currency = self.get(currency_id)
        if update_name:
            if name is None:
                raise AppException("请填写货币名称。")
            cleaned_name = name.strip()
            if not cleaned_name:
                raise AppException("请填写货币名称。")
            currency.name = cleaned_name[:100]
        if update_code:
            cleaned_code = self._normalize_code(code)
            self._ensure_code_unique(cleaned_code, exclude_id=currency_id)
            currency.code = cleaned_code
        self.repository.commit()
        self.repository.refresh(currency)
        return currency

    def delete(self, currency_id: int) -> None:
        currency = self.get(currency_id)
        if self.repository.count_rates(currency_id) > 0:
            raise ConflictException(
                "该货币仍有关联汇率，无法删除。",
                error_code="Currency.HasRates",
            )
        self.repository.delete(currency)
        self.repository.commit()

    def _ensure_code_unique(self, code: str | None, exclude_id: int | None = None) -> None:
        if code is None:
            return
        existing = self.repository.get_by_code(code)
        if existing is not None and existing.id != exclude_id:
            raise ConflictException(
                "该货币代码已存在。",
                error_code="Currency.CodeConflict",
            )

    @staticmethod
    def _normalize_code(code: str | None) -> str | None:
        if code is None:
            return None
        cleaned = code.strip()
        if not cleaned:
            return None
        cleaned_upper = cleaned.upper()
        if not _CODE_RE.fullmatch(cleaned_upper):
            raise AppException(
                "货币代码须为 1~10 位字母或下划线，例如 CNY、MYR_IM。",
                error_code="Currency.InvalidCode",
            )
        return cleaned_upper
