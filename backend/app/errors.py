"""Domain-level exceptions.

The service layer raises these instead of HTTPException so business logic stays
framework-agnostic. A single set of handlers in main.py maps them to HTTP
responses, keeping status-code policy in one place.
"""


class DomainError(Exception):
    """Base class for expected, client-facing errors."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class NotFoundError(DomainError):
    """A requested resource does not exist -> 404."""


class ConflictError(DomainError):
    """A uniqueness or state conflict -> 409 (e.g. duplicate SKU/email)."""


class InsufficientStockError(ConflictError):
    """An order cannot be fulfilled because stock is too low -> 409.

    Carries the offending product so the API can tell the client exactly which
    line item failed.
    """

    def __init__(self, product_id: int, sku: str, requested: int, available: int) -> None:
        super().__init__(
            f"Insufficient stock for product {sku!r} (id={product_id}): "
            f"requested {requested}, available {available}."
        )
        self.product_id = product_id
        self.sku = sku
        self.requested = requested
        self.available = available


class ValidationError(DomainError):
    """A business-rule validation failure not caught by Pydantic -> 400."""
