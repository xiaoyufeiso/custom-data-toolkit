from __future__ import annotations

from datetime import date
from urllib.parse import urlencode

from fastapi import HTTPException, Request

from custom_data_toolkit.repositories.currency_repository import CurrencyRepository
from custom_data_toolkit.repositories.rate_repository import RateRepository
from custom_data_toolkit.routers.globiz_schemas import (
    GlobizCurrency,
    GlobizCurrencyPage,
    GlobizRate,
    GlobizRatePage,
)


class GlobizPublicService:
    def __init__(
        self,
        currency_repository: CurrencyRepository,
        rate_repository: RateRepository,
    ) -> None:
        self.currency_repository = currency_repository
        self.rate_repository = rate_repository

    def list_currencies(
        self,
        *,
        request: Request,
        page: int,
        size: int,
    ) -> GlobizCurrencyPage:
        items, total = self.currency_repository.list_page(q=None, page=page, page_size=size)
        self._ensure_valid_page(page=page, size=size, total=total)
        return GlobizCurrencyPage(
            count=total,
            next=self._page_link(request, page=page + 1, size=size, total=total),
            previous=self._page_link(request, page=page - 1, size=size, total=total),
            results=[
                GlobizCurrency(id=row.id, name=row.name, code=row.code)  # type: ignore[arg-type]
                for row in items
            ],
        )

    def get_currency(self, currency_id: int) -> GlobizCurrency | None:
        row = self.currency_repository.get_by_id(currency_id)
        if row is None or row.id is None:
            return None
        return GlobizCurrency(id=row.id, name=row.name, code=row.code)

    def list_rates(
        self,
        *,
        request: Request,
        page: int,
        size: int,
        currency_code: str | None,
        date_start: date | None,
        date_end: date | None,
    ) -> GlobizRatePage:
        code = currency_code.strip().upper() if currency_code and currency_code.strip() else None
        rows, total = self.rate_repository.list_page(
            currency_id=None,
            code=code,
            on_date=None,
            date_from=date_start,
            date_to=date_end,
            checked=None,
            sort_order="desc",
            page=page,
            page_size=size,
        )
        self._ensure_valid_page(page=page, size=size, total=total)
        extra = {
            "currencyCode": code,
            "dateStart": date_start.isoformat() if date_start else None,
            "dateEnd": date_end.isoformat() if date_end else None,
        }
        return GlobizRatePage(
            count=total,
            next=self._page_link(
                request, page=page + 1, size=size, total=total, extra=extra,
            ),
            previous=self._page_link(
                request, page=page - 1, size=size, total=total, extra=extra,
            ),
            results=[
                GlobizRate(
                    id=rate.id,  # type: ignore[arg-type]
                    data=rate.data,
                    currency=currency.code or "",
                    date=rate.date,
                )
                for rate, currency in rows
            ],
        )

    def get_rate(self, rate_id: int) -> GlobizRate | None:
        pair = self.rate_repository.get_by_id(rate_id)
        if pair is None:
            return None
        rate, currency = pair
        if rate.id is None:
            return None
        return GlobizRate(
            id=rate.id,
            data=rate.data,
            currency=currency.code or "",
            date=rate.date,
        )

    @staticmethod
    def _ensure_valid_page(*, page: int, size: int, total: int) -> None:
        if page < 1:
            raise HTTPException(status_code=404, detail="Invalid page.")
        if total == 0:
            if page != 1:
                raise HTTPException(status_code=404, detail="Invalid page.")
            return
        max_page = (total + size - 1) // size
        if page > max_page:
            raise HTTPException(status_code=404, detail="Invalid page.")

    @staticmethod
    def _page_link(
        request: Request,
        *,
        page: int,
        size: int,
        total: int,
        extra: dict[str, str | None] | None = None,
    ) -> str | None:
        if page < 1:
            return None
        if total == 0:
            return None
        max_page = (total + size - 1) // size
        if page > max_page:
            return None
        params: dict[str, str] = {"page": str(page), "size": str(size)}
        if extra:
            for key, value in extra.items():
                if value:
                    params[key] = value
        return f"{request.url.scheme}://{request.url.netloc}{request.url.path}?{urlencode(params)}"
