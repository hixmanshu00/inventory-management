from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.product import Product


class ProductRepository:
    """Data access for products. No business rules, no commits."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, product: Product) -> Product:
        self.db.add(product)
        self.db.flush()  # assign PK / surface IntegrityError without committing
        return product

    def get(self, product_id: int) -> Product | None:
        return self.db.get(Product, product_id)

    def list(self) -> list[Product]:
        return list(self.db.scalars(select(Product).order_by(Product.id)))

    def get_for_update(self, product_ids: list[int]) -> dict[int, Product]:
        """Lock the given product rows FOR UPDATE and return them by id.

        Used during order creation: locking the rows we're about to decrement
        serialises concurrent orders on the same products, so two orders can't
        both read "5 in stock" and each sell 5. Ordering by id prevents deadlock
        between transactions that lock overlapping sets.
        """
        stmt = (
            select(Product)
            .where(Product.id.in_(product_ids))
            .order_by(Product.id)
            .with_for_update()
        )
        return {p.id: p for p in self.db.scalars(stmt)}

    def delete(self, product: Product) -> None:
        self.db.delete(product)
