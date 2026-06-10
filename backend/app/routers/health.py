from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    # Touch the DB so the check fails loudly if the connection is down, rather
    # than reporting healthy while the app can't actually serve requests.
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
