"""Idempotent seed data so the app isn't empty on first run.

Run with: python -m scripts.seed
Safe to run repeatedly: it skips products/customers that already exist (by SKU /
email) and does nothing if any data is already present.
"""

from decimal import Decimal

from sqlalchemy import select

from app.database import SessionLocal
from app.models.customer import Customer
from app.models.product import Product

PRODUCTS = [
    {"name": "USB-C Cable 1m", "sku": "CBL-USBC-1M", "price": Decimal("9.99"), "quantity_in_stock": 120},
    {"name": "Mechanical Keyboard", "sku": "KBD-MECH-87", "price": Decimal("89.50"), "quantity_in_stock": 25},
    {"name": "27\" 4K Monitor", "sku": "MON-4K-27", "price": Decimal("329.00"), "quantity_in_stock": 8},
    {"name": "Wireless Mouse", "sku": "MSE-WL-001", "price": Decimal("24.99"), "quantity_in_stock": 5},
    {"name": "Laptop Stand", "sku": "STD-LAP-01", "price": Decimal("39.00"), "quantity_in_stock": 60},
]

CUSTOMERS = [
    {"full_name": "Ada Lovelace", "email": "ada@example.com", "phone": "+1-202-555-0101"},
    {"full_name": "Alan Turing", "email": "alan@example.com", "phone": "+1-202-555-0102"},
    {"full_name": "Grace Hopper", "email": "grace@example.com", "phone": None},
]


def seed() -> None:
    db = SessionLocal()
    try:
        existing_skus = set(db.scalars(select(Product.sku)))
        new_products = [Product(**p) for p in PRODUCTS if p["sku"] not in existing_skus]

        existing_emails = set(db.scalars(select(Customer.email)))
        new_customers = [Customer(**c) for c in CUSTOMERS if c["email"] not in existing_emails]

        if not new_products and not new_customers:
            print("Seed: nothing to do, data already present.")
            return

        db.add_all(new_products)
        db.add_all(new_customers)
        db.commit()
        print(f"Seed: inserted {len(new_products)} products, {len(new_customers)} customers.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
