from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Dict, Any, List
import pandas as pd
import joblib
import os

from app.models.model import Model as DBModel
from app.core.database import get_db

router = APIRouter()

class PredictPayload(BaseModel):
    data: List[Dict[str, Any]]

@router.post("/{model_id}")
async def predict_with_model(model_id: str, payload: PredictPayload, db: AsyncSession = Depends(get_db)):
    """
    1-Click Deploy REST endpoint. Takes a JSON list of dictionaries (rows) and returns predictions.
    """
    result = await db.execute(select(DBModel).filter(DBModel.id == model_id))
    model_record = result.scalar_one_or_none()
    
    if not model_record:
        raise HTTPException(status_code=404, detail="Model not found")
        
    storage_path = model_record.storage_path
    if not os.path.exists(storage_path):
        raise HTTPException(status_code=500, detail="Model weights file is missing on the server")
        
    try:
        model = joblib.load(storage_path)
        df = pd.DataFrame(payload.data)
        
        # Extremely basic dynamic preprocessing matching training (needs exact feature names)
        # 1. Fill NaNs with 0
        df = df.fillna(0)
        
        # 2. Get dummies if there are categorical columns
        cat_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        if cat_cols:
            df = pd.get_dummies(df, columns=cat_cols, drop_first=True)
            
        # 3. Align features with the trained model's feature names if scikit-learn
        if hasattr(model, 'feature_names_in_'):
            df = df.reindex(columns=model.feature_names_in_, fill_value=0)
            
        predictions = model.predict(df)
        
        # return list of predictions
        # Handle numpy arrays vs lists vs native types
        return {
            "model_id": model_id,
            "predictions": predictions.tolist() if hasattr(predictions, 'tolist') else list(predictions)
        }
        
    except Exception as e:
        import traceback
        raise HTTPException(status_code=400, detail=f"Inference failed. Check your data format. Error: {str(e)}\n{traceback.format_exc()}")
