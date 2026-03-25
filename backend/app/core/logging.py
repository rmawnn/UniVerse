import logging
import sys

from app.core.config import settings


def setup_logging() -> None:
    """Configure structured logging for the application."""
    level = logging.DEBUG if settings.DEBUG else logging.INFO

    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    # Quiet noisy third-party loggers
    for noisy_logger in (
        "sqlalchemy.engine",
        "uvicorn.access",
        "httpcore",
        "httpx",
    ):
        logging.getLogger(noisy_logger).setLevel(logging.WARNING)


# Application-wide logger — import this in other modules
logger = logging.getLogger("universe")
