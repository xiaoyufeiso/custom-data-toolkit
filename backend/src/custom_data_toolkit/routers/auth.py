from fastapi import APIRouter, Depends, Response

from custom_data_toolkit.config.settings import settings
from custom_data_toolkit.deps import (
    AuthServiceDep,
    CurrentAuthDep,
    OptionalAuthDep,
    require_login_csrf,
    require_session_csrf,
)
from custom_data_toolkit.routers.auth_schemas import (
    AdminPublic,
    ChangePasswordRequest,
    CsrfResponse,
    LoginRequest,
)
from custom_data_toolkit.services.audit_service import record_admin_audit

router = APIRouter(prefix="/auth", tags=["auth"])

CSRF_COOKIE_NAME = "cdt_csrf"


def _cookie_secure() -> bool:
    return settings.app_env != "development"


def _set_session_cookie(response: Response, session_token: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=session_token,
        httponly=True,
        samesite="lax",
        secure=_cookie_secure(),
        path="/",
        max_age=settings.session_ttl_seconds,
    )


def _set_csrf_cookie(response: Response, csrf_token: str) -> None:
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=False,
        samesite="lax",
        secure=_cookie_secure(),
        path="/",
        max_age=settings.session_ttl_seconds,
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(settings.session_cookie_name, path="/")
    response.delete_cookie(CSRF_COOKIE_NAME, path="/")


@router.get("/csrf", response_model=CsrfResponse)
def get_csrf(
    response: Response,
    service: AuthServiceDep,
    auth: OptionalAuthDep,
) -> CsrfResponse:
    if auth is not None:
        token = service.rotate_csrf(auth.session)
    else:
        from custom_data_toolkit.security import new_token

        token = new_token()
    _set_csrf_cookie(response, token)
    return CsrfResponse(csrf_token=token)


@router.post("/login", response_model=AdminPublic)
def login(
    body: LoginRequest,
    response: Response,
    service: AuthServiceDep,
    _: str = Depends(require_login_csrf),
) -> AdminPublic:
    issue = service.login(body.username, body.password)
    _set_session_cookie(response, issue.session_token)
    _set_csrf_cookie(response, issue.csrf_token)
    return AdminPublic(
        id=issue.user.id,  # type: ignore[arg-type]
        username=issue.user.username,
        role=issue.user.role,
        enabled=issue.user.enabled,
    )


@router.get("/me", response_model=AdminPublic)
def me(auth: CurrentAuthDep) -> AdminPublic:
    return AdminPublic(
        id=auth.user.id,  # type: ignore[arg-type]
        username=auth.user.username,
        role=auth.user.role,
        enabled=auth.user.enabled,
    )


@router.post("/logout", status_code=204)
def logout(
    response: Response,
    service: AuthServiceDep,
    auth: CurrentAuthDep,
) -> None:
    # 退出仅依赖有效 Session；不校验 CSRF，避免客户端 CSRF 状态不同步无法退出
    service.logout(auth.session)
    _clear_auth_cookies(response)


@router.post("/change-password", status_code=204)
def change_password(
    body: ChangePasswordRequest,
    service: AuthServiceDep,
    auth: CurrentAuthDep,
    _: None = Depends(require_session_csrf),
) -> None:
    service.change_password(
        user=auth.user,
        session_row=auth.session,
        current_password=body.current_password,
        new_password=body.new_password,
    )
    record_admin_audit(
        auth,
        action="auth.change_password",
        resource_type="admin_user",
        resource_ids=[auth.user.id],
        summary={"changed": True},
    )
