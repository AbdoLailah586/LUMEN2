import mlflow

from app.core.config import settings


def configure_mlflow() -> None:
    mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
