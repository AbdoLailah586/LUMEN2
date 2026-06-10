import os
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.model import Model as DBModel

router = APIRouter()

@router.get("/{model_id}")
async def get_model(model_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DBModel).filter(DBModel.id == model_id))
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return {
        "id": str(model.id),
        "name": model.model_name,
        "model_type": model.model_type,
        "backend": "scikit-learn",  # Fallback since it's not in DB
        "hyperparameters": model.parameters,
        "metrics": model.metrics,
        "feature_importance": {}, # SHAP is in job results, not model
        "created_at": model.created_at
    }

def _resolve_model_file(storage_path: str) -> str:
    if not storage_path:
        raise HTTPException(status_code=404, detail="Model file path not set")

    normalized = storage_path.replace("\\", "/")
    candidates = [
        storage_path,
        normalized,
        os.path.join(os.getcwd(), normalized),
    ]
    if not normalized.startswith("uploads/"):
        candidates.append(os.path.join("uploads", normalized))
        candidates.append(os.path.join(os.getcwd(), "uploads", normalized))

    for path in candidates:
        if path and os.path.isfile(path):
            return path

    raise HTTPException(status_code=404, detail="Model file not found on server")


@router.get("/{model_id}/download")
async def download_model(model_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DBModel).filter(DBModel.id == model_id))
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    file_path = _resolve_model_file(model.storage_path)
    filename = os.path.basename(file_path)
    if not filename.endswith(".joblib"):
        filename = f"{model.model_name or model_id}.joblib"

    return FileResponse(
        file_path,
        media_type="application/octet-stream",
        filename=filename,
    )
