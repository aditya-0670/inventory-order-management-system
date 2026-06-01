import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("app.error")


class AppError(Exception):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "APP_ERROR"
    message = "Application error"

    def __init__(self, message: str | None = None, details: object | None = None):
        self.message = message or self.message
        self.details = details


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "NOT_FOUND"
    message = "Resource not found"


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "CONFLICT"
    message = "Resource conflict"


class InsufficientStockError(ConflictError):
    code = "INSUFFICIENT_STOCK"
    message = "Insufficient stock"


def error_response(status_code: int, code: str, message: str, details: object | None = None) -> JSONResponse:
    body: dict[str, object] = {
        "error": {
            "code": code,
            "message": message,
        }
    }

    if details is not None:
        body["error"]["details"] = details  # type: ignore[index]

    return JSONResponse(status_code=status_code, content=body)


def _field_from_location(location: tuple[object, ...]) -> str:
    parts = [str(part) for part in location if part != "body"]
    return ".".join(parts)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        details = [
            {
                "field": _field_from_location(tuple(error["loc"])),
                "message": error["msg"],
            }
            for error in exc.errors()
        ]
        return error_response(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "VALIDATION_ERROR",
            "Request validation failed",
            details,
        )

    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        return error_response(exc.status_code, exc.code, exc.message, exc.details)

    @app.exception_handler(Exception)
    async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(
            "unexpected application error",
            extra={
                "request_id": getattr(request.state, "request_id", "-"),
                "method": request.method,
                "path": request.url.path,
                "status_code": 500,
            },
        )
        return error_response(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "INTERNAL_SERVER_ERROR",
            "An unexpected error occurred",
        )
