import logging
import sys

from pythonjsonlogger.json import JsonFormatter

from app.core.config import settings
from app.core.request_context import get_request_id


class RequestContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = getattr(record, "request_id", None) or get_request_id() or "-"
        record.method = getattr(record, "method", "-")
        record.path = getattr(record, "path", "-")
        record.status_code = getattr(record, "status_code", "-")
        record.duration_ms = getattr(record, "duration_ms", "-")
        return True


def configure_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(RequestContextFilter())
    handler.setFormatter(
        JsonFormatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s %(method)s %(path)s %(status_code)s %(duration_ms)s"
        )
    )

    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(settings.log_level.upper())
