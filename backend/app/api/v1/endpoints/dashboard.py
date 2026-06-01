from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard import DashboardSummary
from app.services.dashboard_service import DashboardService

router = APIRouter()


def get_dashboard_service(db: Session = Depends(get_db)) -> DashboardService:
    return DashboardService(
        repository=DashboardRepository(db),
        low_stock_threshold=settings.low_stock_threshold,
    )


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    service: DashboardService = Depends(get_dashboard_service),
) -> DashboardSummary:
    return service.get_summary()
