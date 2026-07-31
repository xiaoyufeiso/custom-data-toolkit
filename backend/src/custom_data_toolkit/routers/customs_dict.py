from fastapi import APIRouter, Depends, Query, status

from custom_data_toolkit.deps import CurrentAuthDep, SessionDep, require_session_csrf
from custom_data_toolkit.models.customs_dict import CustomsDictMapping
from custom_data_toolkit.repositories.customs_dict_repository import CustomsDictRepository
from custom_data_toolkit.routers.customs_dict_schemas import (
    CustomsDictMappingCreateRequest,
    CustomsDictMappingListResponse,
    CustomsDictMappingPublic,
    CustomsDictMappingUpdateRequest,
    CustomsDictReplaySyncResponse,
)
from custom_data_toolkit.services.customs_dict_redis import (
    CustomsDictRedisStore,
    create_redis_client,
)
from custom_data_toolkit.services.customs_dict_service import CustomsDictService

router = APIRouter(prefix="/customs-dict/mappings", tags=["customs-dict"])


def get_customs_dict_service(session: SessionDep) -> CustomsDictService:
    return CustomsDictService(
        CustomsDictRepository(session),
        CustomsDictRedisStore(create_redis_client()),
    )


CustomsDictServiceDep = Depends(get_customs_dict_service)


def _to_public(mapping: CustomsDictMapping) -> CustomsDictMappingPublic:
    return CustomsDictMappingPublic(
        id=mapping.id,
        dict_type=mapping.dict_type,
        raw_value=mapping.raw_value,
        standard_value=mapping.standard_value,
        enabled=mapping.enabled,
        source=mapping.source,
        sync_status=mapping.sync_status,
        sync_error=mapping.sync_error,
        last_synced_at=mapping.last_synced_at,
        created_by=mapping.created_by,
        updated_by=mapping.updated_by,
        created_at=mapping.created_at,
        updated_at=mapping.updated_at,
    )


@router.get("", response_model=CustomsDictMappingListResponse)
def list_mappings(
    _auth: CurrentAuthDep,
    service: CustomsDictService = CustomsDictServiceDep,
    dict_type: str | None = Query(default=None, alias="dictType"),
    raw_value: str | None = Query(default=None, alias="rawValue"),
    standard_value: str | None = Query(default=None, alias="standardValue"),
    enabled: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
) -> CustomsDictMappingListResponse:
    items, total = service.list_page(
        dict_type=dict_type,
        raw_value=raw_value,
        standard_value=standard_value,
        enabled=enabled,
        page=page,
        page_size=page_size,
    )
    return CustomsDictMappingListResponse(
        items=[_to_public(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.post(
    "/replay-sync",
    response_model=CustomsDictReplaySyncResponse,
)
def replay_sync(
    _auth: CurrentAuthDep,
    _csrf: None = Depends(require_session_csrf),
    service: CustomsDictService = CustomsDictServiceDep,
    dict_type: str = Query(..., alias="dictType"),
) -> CustomsDictReplaySyncResponse:
    result = service.replay_sync(dict_type=dict_type)
    return CustomsDictReplaySyncResponse(**result)


@router.get("/{mapping_id}", response_model=CustomsDictMappingPublic)
def get_mapping(
    mapping_id: int,
    _auth: CurrentAuthDep,
    service: CustomsDictService = CustomsDictServiceDep,
) -> CustomsDictMappingPublic:
    return _to_public(service.get(mapping_id))


@router.post(
    "",
    response_model=CustomsDictMappingPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_mapping(
    body: CustomsDictMappingCreateRequest,
    auth: CurrentAuthDep,
    _csrf: None = Depends(require_session_csrf),
    service: CustomsDictService = CustomsDictServiceDep,
) -> CustomsDictMappingPublic:
    mapping = service.create(
        dict_type=body.dict_type,
        raw_value=body.raw_value,
        standard_value=body.standard_value,
        actor_id=auth.user.id,
    )
    return _to_public(mapping)


@router.patch("/{mapping_id}", response_model=CustomsDictMappingPublic)
def update_mapping(
    mapping_id: int,
    body: CustomsDictMappingUpdateRequest,
    auth: CurrentAuthDep,
    _csrf: None = Depends(require_session_csrf),
    service: CustomsDictService = CustomsDictServiceDep,
) -> CustomsDictMappingPublic:
    mapping = service.update_standard_value(
        mapping_id,
        standard_value=body.standard_value,
        raw_value=body.raw_value,
        actor_id=auth.user.id,
    )
    return _to_public(mapping)


@router.post("/{mapping_id}/enable", response_model=CustomsDictMappingPublic)
def enable_mapping(
    mapping_id: int,
    auth: CurrentAuthDep,
    _csrf: None = Depends(require_session_csrf),
    service: CustomsDictService = CustomsDictServiceDep,
) -> CustomsDictMappingPublic:
    return _to_public(service.set_enabled(mapping_id, enabled=True, actor_id=auth.user.id))


@router.post("/{mapping_id}/disable", response_model=CustomsDictMappingPublic)
def disable_mapping(
    mapping_id: int,
    auth: CurrentAuthDep,
    _csrf: None = Depends(require_session_csrf),
    service: CustomsDictService = CustomsDictServiceDep,
) -> CustomsDictMappingPublic:
    return _to_public(service.set_enabled(mapping_id, enabled=False, actor_id=auth.user.id))


@router.post("/{mapping_id}/resync", response_model=CustomsDictMappingPublic)
def resync_mapping(
    mapping_id: int,
    auth: CurrentAuthDep,
    _csrf: None = Depends(require_session_csrf),
    service: CustomsDictService = CustomsDictServiceDep,
) -> CustomsDictMappingPublic:
    _ = auth
    return _to_public(service.resync(mapping_id))
