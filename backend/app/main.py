from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.errors import (
    ConflictError,
    DomainError,
    InsufficientStockError,
    NotFoundError,
    ValidationError,
)
from app.routers import customers, health, orders, products, stats


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Inventory & Order Management API", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,  # explicit origins from env, never "*"
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    _register_exception_handlers(app)

    app.include_router(health.router)
    app.include_router(stats.router)
    app.include_router(products.router)
    app.include_router(customers.router)
    app.include_router(orders.router)
    return app


def _error_body(detail: str, code: str) -> dict[str, str]:
    return {"detail": detail, "code": code}


def _register_exception_handlers(app: FastAPI) -> None:
    """Map domain exceptions to HTTP responses in one place.

    Routers and services never build HTTP errors themselves, so status-code
    policy lives here and stays consistent. Clients always receive a structured
    {detail, code} body, never a raw stack trace.
    """

    @app.exception_handler(NotFoundError)
    async def _not_found(_: Request, exc: NotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=_error_body(exc.message, "not_found"),
        )

    @app.exception_handler(InsufficientStockError)
    async def _insufficient_stock(_: Request, exc: InsufficientStockError) -> JSONResponse:
        body = _error_body(exc.message, "insufficient_stock")
        # Surface the offending product so the UI can point at the right line.
        body |= {
            "product_id": str(exc.product_id),
            "requested": str(exc.requested),
            "available": str(exc.available),
        }
        return JSONResponse(status_code=status.HTTP_409_CONFLICT, content=body)

    @app.exception_handler(ConflictError)
    async def _conflict(_: Request, exc: ConflictError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=_error_body(exc.message, "conflict"),
        )

    @app.exception_handler(ValidationError)
    async def _validation(_: Request, exc: ValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=_error_body(exc.message, "validation_error"),
        )

    @app.exception_handler(DomainError)
    async def _domain_fallback(_: Request, exc: DomainError) -> JSONResponse:
        # Any domain error we forgot to special-case is still a client error,
        # not a 500.
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=_error_body(exc.message, "bad_request"),
        )

    @app.exception_handler(RequestValidationError)
    async def _schema_validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        # Pydantic/schema failures -> 422 with the structured field errors.
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": "Request validation failed.",
                "code": "unprocessable_entity",
                "errors": jsonable_encoder(exc.errors()),
            },
        )


app = create_app()
