from datetime import date

from fastapi import APIRouter, Depends, Query, status

from custom_data_toolkit.deps import CurrentAuthDep, SessionDep, require_session_csrf, require_writer
from custom_data_toolkit.models import Currency, Rate
from custom_data_toolkit.repositories.rate_repository import RateRepository
from custom_data_toolkit.routers.common_schemas import BatchIdsRequest
from custom_data_toolkit.routers.rate_schemas import (
    RateCreateRequest,
    RateListResponse,
    RatePublic,
    RateUpdateRequest,
)
from custom_data_toolkit.services.audit_service import record_admin_audit
from custom_data_toolkit.services.auth_service import AuthContext
from custom_data_toolkit.services.rate_service import RateService

router = APIRouter(prefix="/rates", tags=["rates"])


def get_rate_service(session: SessionDep) -> RateService:
    return RateService(RateRepository(session))


RateServiceDep = Depends(get_rate_service)


def _to_public(rate: Rate, currency: Currency) -> RatePublic:
    return RatePublic(
        id=rate.id,
        currency_id=rate.currency_id,
        currency_code=currency.code,
        currency_name=currency.name,
        date=rate.date,
        data=rate.data,
        checked=rate.checked,
        create_time=rate.create_time,
        update_time=rate.update_time,
    )


@router.get("", response_model=RateListResponse)
def list_rates(
    _auth: CurrentAuthDep,
    service: RateService = RateServiceDep,
    currency_id: int | None = Query(None, alias="currencyId"),
    code: str | None = None,
    on_date: date | None = Query(None, alias="date"),
    date_from: date | None = Query(None, alias="dateFrom"),
    date_to: date | None = Query(None, alias="dateTo"),
    checked: bool | None = None,
    sort_order: str = Query("desc", alias="sortOrder"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
) -> RateListResponse:
    items, total = service.list_page(
        currency_id=currency_id,
        code=code,
        on_date=on_date,
        date_from=date_from,
        date_to=date_to,
        checked=checked,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    return RateListResponse(
        items=[_to_public(rate, currency) for rate, currency in items],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.post("", response_model=RatePublic, status_code=status.HTTP_201_CREATED)
def create_rate(
    body: RateCreateRequest,
    auth: AuthContext = Depends(require_writer),
    _csrf: None = Depends(require_session_csrf),
    service: RateService = RateServiceDep,
) -> RatePublic:
    rate, currency = service.create(
        currency_id=body.currency_id,
        on_date=body.date,
        data=body.data,
        checked=body.checked,
    )
    record_admin_audit(
        auth,
        action="rate.create",
        resource_type="rate",
        resource_ids=[rate.id],
        summary={
            "currencyId": currency.id,
            "currencyCode": currency.code,
            "date": str(rate.date),
        },
    )
    return _to_public(rate, currency)


@router.post("/batch-delete", status_code=status.HTTP_204_NO_CONTENT)
def batch_delete_rates(
    body: BatchIdsRequest,
    auth: AuthContext = Depends(require_writer),
    _csrf: None = Depends(require_session_csrf),
    service: RateService = RateServiceDep,
) -> None:
    service.delete_batch(body.ids)
    record_admin_audit(
        auth,
        action="rate.batch_delete",
        resource_type="rate",
        resource_ids=body.ids,
        summary={"count": len(body.ids)},
    )


@router.post("/batch-check", status_code=status.HTTP_204_NO_CONTENT)
def batch_check_rates(
    body: BatchIdsRequest,
    auth: AuthContext = Depends(require_writer),
    _csrf: None = Depends(require_session_csrf),
    service: RateService = RateServiceDep,
) -> None:
    service.check_batch(body.ids)
    record_admin_audit(
        auth,
        action="rate.batch_check",
        resource_type="rate",
        resource_ids=body.ids,
        summary={"count": len(body.ids)},
    )


@router.get("/{rate_id}", response_model=RatePublic)
def get_rate(
    rate_id: int,
    _auth: CurrentAuthDep,
    service: RateService = RateServiceDep,
) -> RatePublic:
    rate, currency = service.get(rate_id)
    return _to_public(rate, currency)


@router.put("/{rate_id}", response_model=RatePublic)
def update_rate(
    rate_id: int,
    body: RateUpdateRequest,
    auth: AuthContext = Depends(require_writer),
    _csrf: None = Depends(require_session_csrf),
    service: RateService = RateServiceDep,
) -> RatePublic:
    rate, currency = service.update(rate_id, data=body.data, checked=body.checked)
    record_admin_audit(
        auth,
        action="rate.update",
        resource_type="rate",
        resource_ids=[rate.id],
        summary={
            "currencyCode": currency.code,
            "date": str(rate.date),
            "checked": rate.checked,
        },
    )
    return _to_public(rate, currency)


@router.delete("/{rate_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rate(
    rate_id: int,
    auth: AuthContext = Depends(require_writer),
    _csrf: None = Depends(require_session_csrf),
    service: RateService = RateServiceDep,
) -> None:
    service.delete(rate_id)
    record_admin_audit(
        auth,
        action="rate.delete",
        resource_type="rate",
        resource_ids=[rate_id],
        summary={"count": 1},
    )
