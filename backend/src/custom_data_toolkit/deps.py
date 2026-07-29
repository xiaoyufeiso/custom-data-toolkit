from typing import Annotated

from fastapi import Cookie, Depends, Request
from sqlmodel import Session

from custom_data_toolkit.config.settings import settings
from custom_data_toolkit.db.session import get_session
from custom_data_toolkit.middleware.error_handler import CsrfFailedException, UnauthorizedException
from custom_data_toolkit.repositories import AuthRepository
from custom_data_toolkit.services import AuthService
from custom_data_toolkit.services.auth_service import AuthContext

SessionDep = Annotated[Session, Depends(get_session)]
CSRF_HEADER = "X-CSRF-Token"
CSRF_COOKIE_NAME = "cdt_csrf"


def get_auth_service(session: SessionDep) -> AuthService:
    return AuthService(AuthRepository(session))


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


def get_optional_auth(
    service: AuthServiceDep,
    session_token: Annotated[
        str | None,
        Cookie(alias=settings.session_cookie_name),
    ] = None,
) -> AuthContext | None:
    if not session_token:
        return None
    try:
        return service.resolve_session(session_token)
    except UnauthorizedException:
        return None


OptionalAuthDep = Annotated[AuthContext | None, Depends(get_optional_auth)]


def get_current_auth(
    service: AuthServiceDep,
    session_token: Annotated[
        str | None,
        Cookie(alias=settings.session_cookie_name),
    ] = None,
) -> AuthContext:
    return service.resolve_session(session_token)


CurrentAuthDep = Annotated[AuthContext, Depends(get_current_auth)]


def require_login_csrf(request: Request) -> str:
    """登录前：双提交 Cookie + Header。"""
    header = request.headers.get(CSRF_HEADER)
    cookie = request.cookies.get(CSRF_COOKIE_NAME)
    if not header or not cookie or header != cookie:
        raise CsrfFailedException()
    return header


def require_session_csrf(
    request: Request,
    auth: CurrentAuthDep,
) -> None:
    header = request.headers.get(CSRF_HEADER)
    if not AuthService.verify_session_csrf(auth.session, header):
        raise CsrfFailedException()
