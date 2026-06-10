"""Test fixtures. The suite runs against a real PostgreSQL database so that
Postgres-specific behaviour we rely on (SELECT ... FOR UPDATE, enum types, CHECK
constraints) is actually exercised, not approximated by SQLite.

Point it at a throwaway database via TEST_DATABASE_URL; it defaults to the local
`inventory_test` db. Tables are created once and truncated between tests.
"""

import os

# Must be set before importing app modules: the engine is built from settings
# at import time.
os.environ.setdefault(
    "DATABASE_URL",
    os.environ.get(
        "TEST_DATABASE_URL",
        "postgresql+psycopg://inventory:inventory@localhost:5432/inventory_test",
    ),
)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.database import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture(autouse=True)
def _clean_tables():
    # Reset state before each test for full isolation; RESTART IDENTITY keeps ids
    # predictable across tests.
    with engine.begin() as conn:
        conn.execute(
            text(
                "TRUNCATE order_items, orders, products, customers "
                "RESTART IDENTITY CASCADE"
            )
        )
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db():
    """A standalone session for arranging data / asserting DB state directly."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
