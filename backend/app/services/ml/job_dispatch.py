import logging
import socket
import threading
from urllib.parse import urlparse

from app.core.config import settings
from app.core.celery_app import celery_app
from app.services.ml.tasks import run_training_job

logger = logging.getLogger(__name__)


def _redis_reachable() -> bool:
    try:
        parsed = urlparse(settings.REDIS_URL)
        host = parsed.hostname or "localhost"
        port = parsed.port or 6379
        with socket.create_connection((host, port), timeout=1.0):
            return True
    except OSError:
        return False


def _celery_workers_available() -> bool:
    if not _redis_reachable():
        return False
    try:
        inspector = celery_app.control.inspect(timeout=1.0)
        ping = inspector.ping()
        return bool(ping)
    except Exception as exc:
        logger.info("No Celery workers responding (%s)", exc)
        return False


def _run_training_in_thread(job_id: str) -> None:
    try:
        run_training_job.apply(args=[job_id])
    except Exception:
        logger.exception("In-process training failed for job %s", job_id)


def dispatch_training_job(job_id: str) -> str:
    """
    Run training on a Celery worker when Redis + a worker are available;
    otherwise execute in a background thread (works without Celery/Redis).
    """
    if _celery_workers_available():
        run_training_job.delay(job_id)
        logger.info("Training job %s dispatched to Celery worker", job_id)
        return "celery"

    logger.info("Running training job %s in-process (no Celery worker)", job_id)
    thread = threading.Thread(
        target=_run_training_in_thread,
        args=(job_id,),
        daemon=True,
        name=f"lumen-training-{job_id[:8]}",
    )
    thread.start()
    return "local"
