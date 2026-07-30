from fastapi import APIRouter, Depends, Query, status

from custom_data_toolkit.deps import CurrentAuthDep, SessionDep, require_session_csrf
from custom_data_toolkit.repositories.currency_repository import CurrencyRepository
from custom_data_toolkit.routers.currency_schemas import (
    CurrencyCreateRequest,
    CurrencyListResponse,
    CurrencyPublic,
    CurrencyUpdateRequest,
)
from custom_data_toolkit.services.currency_service import CurrencyService

router = APIRouter(prefix="/currencies", tags=["currencies"])


def get_currency_service(session: SessionDep) -> CurrencyService:
    return CurrencyService(CurrencyRepository(session))


CurrencyServiceDep = Depends(get_currency_service)


def _to_public(currency) -> CurrencyPublic:
    return CurrencyPublic(id=currency.id, name=currency.name, code=currency.code)


@router.get("", response_model=CurrencyListResponse)
def list_currencies(
    _auth: CurrentAuthDep,
    service: CurrencyService = CurrencyServiceDep,
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
) -> CurrencyListResponse:
    items, total = service.list_page(q=q, page=page, page_size=page_size)
    return CurrencyListResponse(
        items=[_to_public(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.post("", response_model=CurrencyPublic, status_code=status.HTTP_201_CREATED)
def create_currency(
    body: CurrencyCreateRequest,
    _auth: CurrentAuthDep,
    _csrf: None = Depends(require_session_csrf),
    service: CurrencyService = CurrencyServiceDep,
) -> CurrencyPublic:
    currency = service.create(name=body.name, code=body.code)
    return _to_public(currency)


@router.get("/{currency_id}", response_model=CurrencyPublic)
def get_currency(
    currency_id: int,
    _auth: CurrentAuthDep,
    service: CurrencyService = CurrencyServiceDep,
) -> CurrencyPublic:
    return _to_public(service.get(currency_id))


@router.put("/{currency_id}", response_model=CurrencyPublic)
def update_currency(
    currency_id: int,
    body: CurrencyUpdateRequest,
    _auth: CurrentAuthDep,
    _csrf: None = Depends(require_session_csrf),
    service: CurrencyService = CurrencyServiceDep,
) -> CurrencyPublic:
    fields = body.model_fields_set
    currency = service.update(
        currency_id,
        name=body.name,
        code=body.code,
        update_name="name" in fields,
        update_code="code" in fields,
    )
    return _to_public(currency)


@router.delete("/{currency_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_currency(
    currency_id: int,
    _auth: CurrentAuthDep,
    _csrf: None = Depends(require_session_csrf),
    service: CurrencyService = CurrencyServiceDep,
) -> None:
    service.delete(currency_id)
