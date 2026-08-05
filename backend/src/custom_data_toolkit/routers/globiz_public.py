from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse

from custom_data_toolkit.config.settings import settings
from custom_data_toolkit.deps import SessionDep
from custom_data_toolkit.middleware.error_handler import InvalidApiKeyException
from custom_data_toolkit.repositories.api_key_repository import ApiKeyRepository
from custom_data_toolkit.repositories.currency_repository import CurrencyRepository
from custom_data_toolkit.repositories.rate_repository import RateRepository
from custom_data_toolkit.routers.globiz_schemas import (
    GlobizCurrency,
    GlobizCurrencyPage,
    GlobizRate,
    GlobizRatePage,
    GlobizRootLinks,
)
from custom_data_toolkit.services.api_key_service import ApiKeyService
from custom_data_toolkit.services.globiz_public_service import GlobizPublicService

router = APIRouter(tags=["globiz-public"])


def get_globiz_service(session: SessionDep) -> GlobizPublicService:
    return GlobizPublicService(
        CurrencyRepository(session),
        RateRepository(session),
    )


def get_api_key_service(session: SessionDep) -> ApiKeyService:
    return ApiKeyService(ApiKeyRepository(session))


def require_public_api_auth(
    api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
    key_service: ApiKeyService = Depends(get_api_key_service),
) -> None:
    """运维开关 PUBLIC_API_AUTH_ENABLED：true 时校验 X-API-Key。"""
    if not settings.public_api_auth_enabled:
        return
    try:
        key_service.resolve_active_key(api_key)
    except InvalidApiKeyException as exc:
        raise HTTPException(status_code=401, detail=exc.message) from exc


PublicAuthDep = Depends(require_public_api_auth)
GlobizServiceDep = Annotated[GlobizPublicService, Depends(get_globiz_service)]


@router.get("/", response_model=GlobizRootLinks)
def root_links(request: Request, _: None = PublicAuthDep) -> GlobizRootLinks:
    base = f"{request.url.scheme}://{request.url.netloc}"
    return GlobizRootLinks(
        currencies=f"{base}/currencies/",
        rates=f"{base}/rates/",
        openapi=f"{base}/openapi",
    )


@router.get("/currencies/", response_model=GlobizCurrencyPage)
def list_currencies(
    request: Request,
    service: GlobizServiceDep,
    _: None = PublicAuthDep,
    page: int = Query(1),
    size: int = Query(5, ge=1, le=1000),
) -> GlobizCurrencyPage:
    return service.list_currencies(request=request, page=page, size=size)


@router.get("/currencies/{currency_id}/", response_model=GlobizCurrency)
def get_currency(
    currency_id: int,
    service: GlobizServiceDep,
    _: None = PublicAuthDep,
) -> GlobizCurrency:
    item = service.get_currency(currency_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Not found.")
    return item


@router.get("/rates/", response_model=GlobizRatePage)
def list_rates(
    request: Request,
    service: GlobizServiceDep,
    _: None = PublicAuthDep,
    page: int = Query(1),
    size: int = Query(5, ge=1, le=1000),
    currency_code: str | None = Query(None, alias="currencyCode"),
    date_start: date | None = Query(None, alias="dateStart"),
    date_end: date | None = Query(None, alias="dateEnd"),
) -> GlobizRatePage:
    return service.list_rates(
        request=request,
        page=page,
        size=size,
        currency_code=currency_code,
        date_start=date_start,
        date_end=date_end,
    )


@router.get("/rates/{rate_id}/", response_model=GlobizRate)
def get_rate(
    rate_id: int,
    service: GlobizServiceDep,
    _: None = PublicAuthDep,
) -> GlobizRate:
    item = service.get_rate(rate_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Not found.")
    return item


@router.get("/openapi")
def openapi_json(request: Request, _: None = PublicAuthDep) -> JSONResponse:
    return JSONResponse(request.app.openapi())
