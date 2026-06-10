from decimal import Decimal

from pydantic import BaseModel


class LowStockProduct(BaseModel):
    id: int
    name: str
    sku: str
    quantity_in_stock: int


class Stats(BaseModel):
    """Single dashboard payload so the frontend makes one call, not N."""

    total_products: int
    total_customers: int
    total_orders: int
    total_revenue: Decimal
    low_stock_threshold: int
    low_stock_products: list[LowStockProduct]
