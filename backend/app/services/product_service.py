from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errors import ConflictError, NotFoundError
from app.models.product import Product
from app.repositories.product_repository import ProductRepository
from app.schemas.product import ProductCreate, ProductUpdate
from app.services.integrity import constraint_name


class ProductService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = ProductRepository(db)

    def create(self, data: ProductCreate) -> Product:
        product = Product(
            name=data.name,
            sku=data.sku,
            price=data.price,
            quantity_in_stock=data.quantity_in_stock,
        )
        try:
            self.repo.add(product)  # flush here can raise IntegrityError
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            if "sku" in constraint_name(exc).lower():
                raise ConflictError(f"A product with SKU {data.sku!r} already exists.") from exc
            raise
        self.db.refresh(product)
        return product

    def get(self, product_id: int) -> Product:
        product = self.repo.get(product_id)
        if product is None:
            raise NotFoundError(f"Product {product_id} not found.")
        return product

    def list(self) -> list[Product]:
        return self.repo.list()

    def update(self, product_id: int, data: ProductUpdate) -> Product:
        product = self.get(product_id)
        product.name = data.name
        product.sku = data.sku
        product.price = data.price
        product.quantity_in_stock = data.quantity_in_stock
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            if "sku" in constraint_name(exc).lower():
                raise ConflictError(f"A product with SKU {data.sku!r} already exists.") from exc
            raise
        self.db.refresh(product)
        return product

    def delete(self, product_id: int) -> None:
        product = self.get(product_id)
        self.repo.delete(product)
        try:
            self.db.commit()
        except IntegrityError as exc:
            # The FK from order_items uses ON DELETE RESTRICT: we keep the order
            # history intact rather than letting a product deletion erase what a
            # customer was charged for.
            self.db.rollback()
            raise ConflictError(
                f"Product {product_id} cannot be deleted because it is referenced by orders."
            ) from exc
