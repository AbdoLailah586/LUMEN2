from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Any
import uuid

from app.models.model import Model as DBModel
from app.core.database import get_db
from app.services.storage import get_storage_service

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

@router.get("/{model_id}/download")
async def download_model(model_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DBModel).filter(DBModel.id == model_id))
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
        
    storage_svc = get_storage_service()
    signed_url = storage_svc.get_signed_url(model.storage_path)
    
    if not signed_url:
        raise HTTPException(status_code=500, detail="Could not generate secure download link")
        
    return {"download_url": signed_url}
