from fastapi import APIRouter, Depends, Query

from custom_data_toolkit.deps import SessionDep, require_admin, require_session_csrf
from custom_data_toolkit.models import AdminUser
from custom_data_toolkit.repositories import AuthRepository
from custom_data_toolkit.routers.admin_user_schemas import (
    AdminUserCreateRequest,
    AdminUserListResponse,
    AdminUserPublic,
    AdminUserResetPasswordRequest,
    AdminUserUpdateRequest,
)
from custom_data_toolkit.services.admin_user_service import AdminUserService
from custom_data_toolkit.services.audit_service import record_admin_audit
from custom_data_toolkit.services.auth_service import AuthContext

router = APIRouter(prefix="/admin-users", tags=["admin-users"])


def get_admin_user_service(session: SessionDep) -> AdminUserService:
    return AdminUserService(AuthRepository(session))


def _to_public(user: AdminUser) -> AdminUserPublic:
    return AdminUserPublic(
        id=user.id,  # type: ignore[arg-type]
        username=user.username,
        role=user.role,
        enabled=user.enabled,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("", response_model=AdminUserListResponse)
def list_admin_users(
    _admin: AuthContext = Depends(require_admin),
    service: AdminUserService = Depends(get_admin_user_service),
    q: str | None = Query(default=None),
    role: str | None = Query(default=None),
    enabled: bool | None = Query(default=None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
) -> AdminUserListResponse:
    items, total = service.list_page(
        q=q,
        role=role,
        enabled=enabled,
        page=page,
        page_size=page_size,
    )
    return AdminUserListResponse(
        items=[_to_public(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.post("", response_model=AdminUserPublic, status_code=201)
def create_admin_user(
    body: AdminUserCreateRequest,
    auth: AuthContext = Depends(require_admin),
    _csrf: None = Depends(require_session_csrf),
    service: AdminUserService = Depends(get_admin_user_service),
) -> AdminUserPublic:
    user = service.create(
        username=body.username,
        password=body.password,
        role=body.role,
    )
    record_admin_audit(
        auth,
        action="admin_user.create",
        resource_type="admin_user",
        resource_ids=[user.id],
        summary={"username": user.username, "role": user.role},
    )
    return _to_public(user)


@router.patch("/{user_id}", response_model=AdminUserPublic)
def update_admin_user(
    user_id: int,
    body: AdminUserUpdateRequest,
    auth: AuthContext = Depends(require_admin),
    _csrf: None = Depends(require_session_csrf),
    service: AdminUserService = Depends(get_admin_user_service),
) -> AdminUserPublic:
    user = service.update(
        user_id=user_id,
        actor_id=auth.user.id,  # type: ignore[arg-type]
        role=body.role,
        enabled=body.enabled,
    )
    record_admin_audit(
        auth,
        action="admin_user.update",
        resource_type="admin_user",
        resource_ids=[user.id],
        summary={
            "username": user.username,
            "role": user.role,
            "enabled": user.enabled,
        },
    )
    return _to_public(user)


@router.post("/{user_id}/reset-password", status_code=204)
def reset_admin_user_password(
    user_id: int,
    body: AdminUserResetPasswordRequest,
    auth: AuthContext = Depends(require_admin),
    _csrf: None = Depends(require_session_csrf),
    service: AdminUserService = Depends(get_admin_user_service),
) -> None:
    service.reset_password(user_id=user_id, new_password=body.password)
    record_admin_audit(
        auth,
        action="admin_user.reset_password",
        resource_type="admin_user",
        resource_ids=[user_id],
        summary={"reset": True},
    )
