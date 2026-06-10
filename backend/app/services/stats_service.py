from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.customer import Customer
from app.models.order import Order
from app.models.product import Product
from app.schemas.stats import LowStockProduct, Stats


class StatsService:
    """Aggregates dashboard figures in a few queries instead of N round-trips."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.threshold = get_settings().low_stock_threshold

    def get_stats(self) -> Stats:
        total_products = self.db.scalar(select(func.count()).select_from(Product)) or 0
        total_customers = self.db.scalar(select(func.count()).select_from(Customer)) or 0
        total_orders = self.db.scalar(select(func.count()).select_from(Order)) or 0
        total_revenue = self.db.scalar(select(func.coalesce(func.sum(Order.total_amount), 0)))

        low_stock = self.db.scalars(
            select(Product)
            .where(Product.quantity_in_stock <= self.threshold)
            .order_by(Product.quantity_in_stock.asc())
        )

        return Stats(
            total_products=total_products,
            total_customers=total_customers,
            total_orders=total_orders,
            total_revenue=Decimal(total_revenue),
            low_stock_threshold=self.threshold,
            low_stock_products=[
                LowStockProduct(
                    id=p.id, name=p.name, sku=p.sku, quantity_in_stock=p.quantity_in_stock
                )
                for p in low_stock
            ],
        )
