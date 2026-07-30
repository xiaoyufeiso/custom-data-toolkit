from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppException(Exception):
    status_code = 400
    error_code = "App.BadRequest"

    def __init__(self, message: str, error_code: str | None = None) -> None:
        self.message = message
        if error_code is not None:
            self.error_code = error_code


class NotFoundException(AppException):
    status_code = 404
    error_code = "App.NotFound"

    def __init__(self, message: str = "资源不存在。", error_code: str | None = None) -> None:
        super().__init__(message, error_code=error_code)


class UnauthorizedException(AppException):
    status_code = 401
    error_code = "Auth.Unauthorized"

    def __init__(self, message: str = "请先登录。", error_code: str | None = None) -> None:
        super().__init__(message, error_code=error_code)


class InvalidApiKeyException(UnauthorizedException):
    error_code = "Auth.InvalidApiKey"

    def __init__(self, message: str = "API Key 无效或已停用。") -> None:
        super().__init__(message, error_code=self.error_code)


class ConflictException(AppException):
    status_code = 409
    error_code = "App.Conflict"

    def __init__(self, message: str, error_code: str = "App.Conflict") -> None:
        self.error_code = error_code
        super().__init__(message)


class LoginFailedException(AppException):
    status_code = 401
    error_code = "Auth.LoginFailed"

    def __init__(self, message: str = "用户名或密码错误。") -> None:
        super().__init__(message)


class CsrfFailedException(AppException):
    status_code = 403
    error_code = "Auth.CsrfFailed"

    def __init__(self, message: str = "安全校验失败，请刷新页面后重试。") -> None:
        super().__init__(message)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppException)
    async def handle_app_exception(request: Request, exc: AppException) -> JSONResponse:
        request_id = request.headers.get("X-Request-ID")
        return JSONResponse(
            status_code=exc.status_code,
            content={"code": exc.error_code, "message": exc.message, "requestId": request_id},
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request,
        _exc: RequestValidationError,
    ) -> JSONResponse:
        request_id = request.headers.get("X-Request-ID")
        return JSONResponse(
            status_code=422,
            content={
                "code": "App.ValidationError",
                "message": "请求参数不正确，请检查后重试。",
                "requestId": request_id,
            },
        )
