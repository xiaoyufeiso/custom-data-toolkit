from typing import Literal

from fastapi import APIRouter, Depends, Query, status

from custom_data_toolkit.deps import (
    CurrentAuthDep,
    SessionDep,
    require_session_csrf,
    require_writer,
)
from custom_data_toolkit.repositories.currency_repository import CurrencyRepository
from custom_data_toolkit.routers.common_schemas import BatchIdsRequest
from custom_data_toolkit.routers.currency_schemas import (
    CurrencyCreateRequest,
    CurrencyListResponse,
    CurrencyPublic,
    CurrencySuggestionPublic,
    CurrencyUpdateRequest,
)
from custom_data_toolkit.services.audit_service import record_admin_audit
from custom_data_toolkit.services.auth_service import AuthContext
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
    auth: AuthContext = Depends(require_writer),
    _csrf: None = Depends(require_session_csrf),
    service: CurrencyService = CurrencyServiceDep,
) -> CurrencyPublic:
    currency = service.create(name=body.name, code=body.code)
    record_admin_audit(
        auth,
        action="currency.create",
        resource_type="currency",
        resource_ids=[currency.id],
        summary={"name": currency.name, "code": currency.code},
    )
    return _to_public(currency)


@router.get("/suggestions", response_model=list[CurrencySuggestionPublic])
def list_currency_suggestions(
    _auth: CurrentAuthDep,
    service: CurrencyService = CurrencyServiceDep,
    prefix: str = Query(..., min_length=1, max_length=100),
    field: Literal["nameOrCode", "code"] = "nameOrCode",
    limit: int = Query(10, ge=1, le=10),
) -> list[CurrencySuggestionPublic]:
    suggestions = service.list_suggestions(prefix=prefix, field=field, limit=limit)
    return [
        CurrencySuggestionPublic(
            id=currency.id,
            name=currency.name,
            code=currency.code,
            match_field=match_field,
        )
        for currency, match_field in suggestions
    ]


@router.post("/batch-delete", status_code=status.HTTP_204_NO_CONTENT)
def batch_delete_currencies(
    body: BatchIdsRequest,
    auth: AuthContext = Depends(require_writer),
    _csrf: None = Depends(require_session_csrf),
    service: CurrencyService = CurrencyServiceDep,
) -> None:
    service.delete_batch(body.ids)
    record_admin_audit(
        auth,
        action="currency.batch_delete",
        resource_type="currency",
        resource_ids=body.ids,
        summary={"count": len(body.ids)},
    )


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
    auth: AuthContext = Depends(require_writer),
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
    record_admin_audit(
        auth,
        action="currency.update",
        resource_type="currency",
        resource_ids=[currency.id],
        summary={"name": currency.name, "code": currency.code},
    )
    return _to_public(currency)


@router.delete("/{currency_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_currency(
    currency_id: int,
    auth: AuthContext = Depends(require_writer),
    _csrf: None = Depends(require_session_csrf),
    service: CurrencyService = CurrencyServiceDep,
) -> None:
    service.delete(currency_id)
    record_admin_audit(
        auth,
        action="currency.delete",
        resource_type="currency",
        resource_ids=[currency_id],
        summary={"count": 1},
    )
