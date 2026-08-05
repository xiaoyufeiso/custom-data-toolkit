from fastapi import APIRouter, Depends, status

from custom_data_toolkit.deps import SessionDep, require_session_csrf, require_writer
from custom_data_toolkit.models import ApiKey
from custom_data_toolkit.repositories.api_key_repository import ApiKeyRepository
from custom_data_toolkit.routers.api_key_schemas import (
    ApiKeyCreateRequest,
    ApiKeyCreateResponse,
    ApiKeyPublic,
    ApiKeyUpdateRequest,
)
from custom_data_toolkit.services.api_key_service import ApiKeyService
from custom_data_toolkit.services.audit_service import record_admin_audit
from custom_data_toolkit.services.auth_service import AuthContext

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


def get_api_key_service(session: SessionDep) -> ApiKeyService:
    return ApiKeyService(ApiKeyRepository(session))


ApiKeyServiceDep = Depends(get_api_key_service)


def _to_public(row: ApiKey) -> ApiKeyPublic:
    return ApiKeyPublic(
        id=row.id,
        name=row.name,
        key_prefix=row.key_prefix,
        enabled=row.enabled,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("", response_model=list[ApiKeyPublic])
def list_api_keys(
    _writer: AuthContext = Depends(require_writer),
    service: ApiKeyService = ApiKeyServiceDep,
) -> list[ApiKeyPublic]:
    rows = service.list_all()
    return [_to_public(row) for row in rows]


@router.post("", response_model=ApiKeyCreateResponse, status_code=status.HTTP_201_CREATED)
def create_api_key(
    body: ApiKeyCreateRequest,
    auth: AuthContext = Depends(require_writer),
    _csrf: None = Depends(require_session_csrf),
    service: ApiKeyService = ApiKeyServiceDep,
) -> ApiKeyCreateResponse:
    issue = service.create(name=body.name, created_by=auth.user.id)
    record_admin_audit(
        auth,
        action="api_key.create",
        resource_type="api_key",
        resource_ids=[issue.row.id],
        summary={"name": issue.row.name, "keyPrefix": issue.row.key_prefix},
    )
    return ApiKeyCreateResponse(
        id=issue.row.id,
        name=issue.row.name,
        key_prefix=issue.row.key_prefix,
        key=issue.plaintext_key,
        enabled=issue.row.enabled,
        created_at=issue.row.created_at,
        updated_at=issue.row.updated_at,
    )


@router.patch("/{key_id}", response_model=ApiKeyPublic)
def update_api_key(
    key_id: int,
    body: ApiKeyUpdateRequest,
    auth: AuthContext = Depends(require_writer),
    _csrf: None = Depends(require_session_csrf),
    service: ApiKeyService = ApiKeyServiceDep,
) -> ApiKeyPublic:
    row = service.update(key_id, name=body.name, enabled=body.enabled)
    record_admin_audit(
        auth,
        action="api_key.update",
        resource_type="api_key",
        resource_ids=[row.id],
        summary={"name": row.name, "enabled": row.enabled, "keyPrefix": row.key_prefix},
    )
    return _to_public(row)


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_api_key(
    key_id: int,
    auth: AuthContext = Depends(require_writer),
    _csrf: None = Depends(require_session_csrf),
    service: ApiKeyService = ApiKeyServiceDep,
) -> None:
    service.delete(key_id)
    record_admin_audit(
        auth,
        action="api_key.delete",
        resource_type="api_key",
        resource_ids=[key_id],
        summary={"count": 1},
    )
