from datetime import datetime

from fastapi import APIRouter, Depends, Query

from custom_data_toolkit.deps import SessionDep, require_admin
from custom_data_toolkit.models.admin import AdminAuditLog
from custom_data_toolkit.repositories.audit_log_repository import AuditLogRepository
from custom_data_toolkit.routers.audit_schemas import AuditLogListResponse, AuditLogPublic
from custom_data_toolkit.services.audit_service import AuditService
from custom_data_toolkit.services.auth_service import AuthContext

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


def get_audit_service(session: SessionDep) -> AuditService:
    return AuditService(AuditLogRepository(session))


def _to_public(row: AdminAuditLog) -> AuditLogPublic:
    assert row.id is not None
    return AuditLogPublic(
        id=row.id,
        actor_user_id=row.actor_user_id,
        actor_username=row.actor_username,
        action=row.action,
        resource_type=row.resource_type,
        resource_ids=row.resource_ids,
        summary=row.summary,
        created_at=row.created_at,
    )


@router.get("", response_model=AuditLogListResponse)
def list_audit_logs(
    _admin: AuthContext = Depends(require_admin),
    service: AuditService = Depends(get_audit_service),
    actor_username: str | None = Query(default=None, alias="actorUsername"),
    action: str | None = None,
    resource_type: str | None = Query(default=None, alias="resourceType"),
    created_from: datetime | None = Query(default=None, alias="createdFrom"),
    created_to: datetime | None = Query(default=None, alias="createdTo"),
    sort_order: str | None = Query(default=None, alias="sortOrder"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
) -> AuditLogListResponse:
    cleaned_sort = (sort_order or "").strip().lower() or None
    if cleaned_sort not in {None, "asc", "desc"}:
        cleaned_sort = None
    items, total = service.list_page(
        actor_username=actor_username,
        action=action,
        resource_type=resource_type,
        created_from=created_from,
        created_to=created_to,
        sort_order=cleaned_sort,
        page=page,
        page_size=page_size,
    )
    return AuditLogListResponse(
        items=[_to_public(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get("/{log_id}", response_model=AuditLogPublic)
def get_audit_log(
    log_id: int,
    _admin: AuthContext = Depends(require_admin),
    service: AuditService = Depends(get_audit_service),
) -> AuditLogPublic:
    return _to_public(service.get(log_id))
