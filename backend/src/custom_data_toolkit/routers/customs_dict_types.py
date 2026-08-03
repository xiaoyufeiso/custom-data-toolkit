from fastapi import APIRouter, Depends, Query, status

from custom_data_toolkit.deps import CurrentAuthDep, SessionDep, require_session_csrf
from custom_data_toolkit.models.customs_dict import CustomsDictType
from custom_data_toolkit.repositories.customs_dict_type_repository import (
    CustomsDictTypeRepository,
)
from custom_data_toolkit.routers.customs_dict_schemas import (
    CustomsDictTypeCreateRequest,
    CustomsDictTypeListResponse,
    CustomsDictTypeOption,
    CustomsDictTypePublic,
    CustomsDictTypeUpdateRequest,
)
from custom_data_toolkit.services.customs_dict_type_service import CustomsDictTypeService

router = APIRouter(prefix="/customs-dict/types", tags=["customs-dict"])


def get_customs_dict_type_service(session: SessionDep) -> CustomsDictTypeService:
    return CustomsDictTypeService(CustomsDictTypeRepository(session))


CustomsDictTypeServiceDep = Depends(get_customs_dict_type_service)


def _to_public(row: CustomsDictType, mapping_count: int) -> CustomsDictTypePublic:
    assert row.id is not None
    return CustomsDictTypePublic(
        id=row.id,
        code=row.code,
        name=row.name,
        enabled=row.enabled,
        mapping_count=mapping_count,
        created_by=row.created_by,
        updated_by=row.updated_by,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("", response_model=CustomsDictTypeListResponse)
def list_types(
    _auth: CurrentAuthDep,
    service: CustomsDictTypeService = CustomsDictTypeServiceDep,
    enabled: bool | None = None,
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
) -> CustomsDictTypeListResponse:
    items, total = service.list_page(
        enabled=enabled,
        q=q,
        page=page,
        page_size=page_size,
    )
    return CustomsDictTypeListResponse(
        items=[_to_public(row, count) for row, count in items],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get("/options", response_model=list[CustomsDictTypeOption])
def list_type_options(
    _auth: CurrentAuthDep,
    service: CustomsDictTypeService = CustomsDictTypeServiceDep,
) -> list[CustomsDictTypeOption]:
    return [
        CustomsDictTypeOption(code=row.code, name=row.name)
        for row in service.list_options()
    ]


@router.post(
    "",
    response_model=CustomsDictTypePublic,
    status_code=status.HTTP_201_CREATED,
)
def create_type(
    body: CustomsDictTypeCreateRequest,
    auth: CurrentAuthDep,
    _csrf: None = Depends(require_session_csrf),
    service: CustomsDictTypeService = CustomsDictTypeServiceDep,
) -> CustomsDictTypePublic:
    row = service.create(code=body.code, name=body.name, actor_id=auth.user.id)
    return _to_public(row, 0)


@router.patch("/{type_id}", response_model=CustomsDictTypePublic)
def update_type(
    type_id: int,
    body: CustomsDictTypeUpdateRequest,
    auth: CurrentAuthDep,
    _csrf: None = Depends(require_session_csrf),
    service: CustomsDictTypeService = CustomsDictTypeServiceDep,
) -> CustomsDictTypePublic:
    row = service.update_name(
        type_id,
        name=body.name,
        code=body.code,
        actor_id=auth.user.id,
    )
    return _to_public(row, service.repository.count_mappings(row.code))


@router.post("/{type_id}/enable", response_model=CustomsDictTypePublic)
def enable_type(
    type_id: int,
    auth: CurrentAuthDep,
    _csrf: None = Depends(require_session_csrf),
    service: CustomsDictTypeService = CustomsDictTypeServiceDep,
) -> CustomsDictTypePublic:
    row = service.enable(type_id, actor_id=auth.user.id)
    return _to_public(row, service.repository.count_mappings(row.code))


@router.post("/{type_id}/disable", response_model=CustomsDictTypePublic)
def disable_type(
    type_id: int,
    auth: CurrentAuthDep,
    _csrf: None = Depends(require_session_csrf),
    service: CustomsDictTypeService = CustomsDictTypeServiceDep,
) -> CustomsDictTypePublic:
    row = service.disable(type_id, actor_id=auth.user.id)
    return _to_public(row, 0)
