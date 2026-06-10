from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.order import Order


class OrderRepository:
    """Data access for orders. No business rules, no commits."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, order: Order) -> Order:
        self.db.add(order)
        self.db.flush()
        return order

    def get(self, order_id: int) -> Order | None:
        return self.db.get(Order, order_id)

    def list(self) -> list[Order]:
        # Newest first; items are eager-loaded via the relationship's selectin.
        return list(self.db.scalars(select(Order).order_by(Order.created_at.desc())))

    def count_for_customer(self, customer_id: int) -> int:
        stmt = select(func.count()).select_from(Order).where(Order.customer_id == customer_id)
        return self.db.scalar(stmt) or 0

    def delete(self, order: Order) -> None:
        self.db.delete(order)
