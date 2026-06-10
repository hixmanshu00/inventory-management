from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings

_settings = get_settings()

# pool_pre_ping avoids handing out connections the DB has already closed
# (common after the Postgres container restarts in local/dev).
engine = create_engine(_settings.database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a request-scoped session.

    The session is always closed; commit/rollback is owned by the service layer
    so a single business operation maps to a single transaction.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
