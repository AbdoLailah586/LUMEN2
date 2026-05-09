from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.services.ml.tasks", "app.services.rl.tasks", "app.services.gnn.tasks", "app.services.cv.cv_tasks"]
)

celery_app.conf.task_routes = {
    "app.services.ml.*": "ml",
    "app.services.rl.*": "rl",
    "app.services.gnn.*": "gnn",
    "app.services.cleaning.*": "cleaning",
    "app.services.cv.*": "cv"
}

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

