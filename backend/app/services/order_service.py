from collections import defaultdict
from decimal import Decimal

from sqlalchemy.orm import Session

from app.errors import InsufficientStockError, NotFoundError, ValidationError
from app.models.order import Order, OrderItem, OrderStatus
from app.repositories.customer_repository import CustomerRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.order import OrderCreate


class OrderService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.orders = OrderRepository(db)
        self.products = ProductRepository(db)
        self.customers = CustomerRepository(db)

    def create(self, data: OrderCreate) -> Order:
        """Create an order atomically.

        The entire operation is one transaction: we lock every ordered product
        row, validate stock for all of them, and only then decrement and persist.
        If any single line item is short, the whole order is rejected and nothing
        is written. Total is computed here from current product prices and never
        taken from the client.
        """
        if self.customers.get(data.customer_id) is None:
            raise NotFoundError(f"Customer {data.customer_id} not found.")

        # Merge repeated products into a single required quantity so a product
        # listed twice is validated and decremented against one combined demand.
        required: dict[int, int] = defaultdict(int)
        for item in data.items:
            required[item.product_id] += item.quantity

        # Lock the rows we're about to read-then-write. Without FOR UPDATE two
        # concurrent orders could both see the same stock and oversell.
        locked = self.products.get_for_update(list(required.keys()))

        missing = sorted(required.keys() - locked.keys())
        if missing:
            raise NotFoundError(f"Product(s) not found: {', '.join(map(str, missing))}.")

        # Validate all line items before mutating any stock, so a later failure
        # never leaves earlier products already decremented.
        for product_id, qty in required.items():
            product = locked[product_id]
            if product.quantity_in_stock < qty:
                raise InsufficientStockError(
                    product_id=product.id,
                    sku=product.sku,
                    requested=qty,
                    available=product.quantity_in_stock,
                )

        order = Order(
            customer_id=data.customer_id,
            status=OrderStatus.CONFIRMED,
            total_amount=Decimal("0.00"),
        )

        total = Decimal("0.00")
        # Build one OrderItem per submitted line (preserving the client's
        # breakdown), pricing each from the locked product.
        for item in data.items:
            product = locked[item.product_id]
            product.quantity_in_stock -= item.quantity
            line_total = product.price * item.quantity
            total += line_total
            order.items.append(
                OrderItem(
                    product_id=product.id,
                    product_name=product.name,
                    quantity=item.quantity,
                    unit_price=product.price,
                )
            )

        order.total_amount = total
        self.orders.add(order)
        self.db.commit()
        self.db.refresh(order)
        return order

    def get(self, order_id: int) -> Order:
        order = self.orders.get(order_id)
        if order is None:
            raise NotFoundError(f"Order {order_id} not found.")
        return order

    def list(self) -> list[Order]:
        return self.orders.list()

    def delete(self, order_id: int) -> None:
        """Delete an order and restore its stock.

        Decision (documented in the README): deleting an order returns each line
        item's quantity to inventory. We treat a deleted order as cancelled, so
        the goods are considered back on the shelf. Done in one transaction with
        the same FOR UPDATE lock used at creation to avoid racing a concurrent
        order on the same products.
        """
        order = self.get(order_id)

        required_ids = [item.product_id for item in order.items]
        locked = self.products.get_for_update(required_ids)
        for item in order.items:
            product = locked.get(item.product_id)
            if product is not None:  # product could have been deleted meanwhile
                product.quantity_in_stock += item.quantity

        self.orders.delete(order)
        self.db.commit()
