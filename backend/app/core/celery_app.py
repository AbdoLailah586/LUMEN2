from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.services.ml.tasks", "app.services.rl.tasks", "app.services.gnn.tasks", "app.services.cv.cv_tasks"]
)

# Use the default "celery" queue so workers pick up tasks without -Q flags.
celery_app.conf.task_default_queue = "celery"

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

