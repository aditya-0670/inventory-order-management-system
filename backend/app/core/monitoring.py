from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import SessionLocal


def check_database_ready() -> bool:
    try:
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
    except SQLAlchemyError:
        return False

    return True


def get_metrics() -> tuple[bytes, str]:
    return generate_latest(), CONTENT_TYPE_LATEST
