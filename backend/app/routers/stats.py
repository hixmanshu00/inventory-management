from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.stats import Stats
from app.services.stats_service import StatsService

router = APIRouter(tags=["stats"])


@router.get("/stats", response_model=Stats)
def get_stats(db: Session = Depends(get_db)) -> Stats:
    return StatsService(db).get_stats()
