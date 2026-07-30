from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query

from custom_data_toolkit.deps import SessionDep
from custom_data_toolkit.models import Rate
from custom_data_toolkit.repositories.api_key_repository import ApiKeyRepository
from custom_data_toolkit.repositories.rate_repository import RateRepository
from custom_data_toolkit.routers.public_schemas import PublicRateItem, PublicRateListResponse
from custom_data_toolkit.services.api_key_service import ApiKeyService
from custom_data_toolkit.services.public_rate_service import PublicRateService

router = APIRouter(prefix="/public", tags=["public-rates"])


def get_public_rate_service(session: SessionDep) -> PublicRateService:
    return PublicRateService(RateRepository(session))


def get_api_key_service(session: SessionDep) -> ApiKeyService:
    return ApiKeyService(ApiKeyRepository(session))


PublicRateServiceDep = Depends(get_public_rate_service)
ApiKeyServiceDep = Depends(get_api_key_service)


def _to_public_item(code: str, row: Rate) -> PublicRateItem:
    return PublicRateItem(
        currency_code=code,
        date=row.date,
        data=row.data,
        checked=row.checked,
    )


@router.get("/rates", response_model=PublicRateListResponse)
def query_public_rates(
    code: str,
    on_date: date | None = Query(None, alias="date"),
    date_from: date | None = Query(None, alias="dateFrom"),
    date_to: date | None = Query(None, alias="dateTo"),
    api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
    service: PublicRateService = PublicRateServiceDep,
    key_service: ApiKeyService = ApiKeyServiceDep,
) -> PublicRateListResponse:
    key_service.resolve_active_key(api_key)
    normalized_code, rows = service.query(
        code=code,
        on_date=on_date,
        date_from=date_from,
        date_to=date_to,
    )
    return PublicRateListResponse(items=[_to_public_item(normalized_code, row) for row in rows])
