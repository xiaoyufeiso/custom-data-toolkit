from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    status_code = 400
    error_code = "App.BadRequest"

    def __init__(self, message: str) -> None:
        self.message = message


class NotFoundException(AppException):
    status_code = 404
    error_code = "App.NotFound"


class UnauthorizedException(AppException):
    status_code = 401
    error_code = "Auth.Unauthorized"

    def __init__(self, message: str = "Authentication required.") -> None:
        super().__init__(message)


class LoginFailedException(AppException):
    status_code = 401
    error_code = "Auth.LoginFailed"

    def __init__(self, message: str = "Invalid username or password.") -> None:
        super().__init__(message)


class CsrfFailedException(AppException):
    status_code = 403
    error_code = "Auth.CsrfFailed"

    def __init__(self, message: str = "CSRF validation failed.") -> None:
        super().__init__(message)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppException)
    async def handle_app_exception(request: Request, exc: AppException) -> JSONResponse:
        request_id = request.headers.get("X-Request-ID")
        return JSONResponse(
            status_code=exc.status_code,
            content={"code": exc.error_code, "message": exc.message, "requestId": request_id},
        )
