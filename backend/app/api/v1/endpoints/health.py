from fastapi import APIRouter, Response, status

from app.core.config import settings
from app.core.monitoring import check_database_ready, get_metrics

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


@router.get("/ready")
def ready(response: Response) -> dict[str, str]:
    if not check_database_ready():
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "not_ready", "database": "unavailable"}

    return {"status": "ready", "database": "available"}


@router.get("/metrics")
def metrics() -> Response:
    content, media_type = get_metrics()
    return Response(content=content, media_type=media_type)
