from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import pandas as pd
import os

from app.core.database import get_db
from app.models.dataset import Dataset
from app.services.ai.gemini_service import GeminiService
from app.services.ai.feature_suggester import FeatureSuggester
from app.services.storage import get_storage_service

router = APIRouter()
ai_service = GeminiService()
feature_suggester = FeatureSuggester(ai_service)

async def get_dataset_sample(dataset_id: str, db: AsyncSession) -> pd.DataFrame:
    result = await db.execute(select(Dataset).filter(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    storage_svc = get_storage_service()
    temp_path = f"temp_sample_{dataset.filename}"
    storage_svc.download_file(dataset.storage_path, temp_path)
    
    try:
        if dataset.file_type == 'csv':
            df = pd.read_csv(temp_path, nrows=500)
        elif dataset.file_type == 'parquet':
            df = pd.read_parquet(temp_path).head(500)
        else:
            df = pd.read_csv(temp_path, nrows=500) # Fallback
        return df
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.post("/analyze-data")
async def analyze_data(dataset_id: str, db: AsyncSession = Depends(get_db)):
    df = await get_dataset_sample(dataset_id, db)
    analysis = await ai_service.analyze_columns(df)
    return {"dataset_id": dataset_id, "column_analysis": analysis}

@router.post("/suggest-cleaning")
async def suggest_cleaning(dataset_id: str, db: AsyncSession = Depends(get_db)):
    df = await get_dataset_sample(dataset_id, db)
    column_analysis = await ai_service.analyze_columns(df)
    
    # Simple stats
    stats = {
        "missing": df.isnull().sum().to_dict(),
        "outliers": {col: 0 for col in df.select_dtypes('number').columns} # Placeholder
    }
    
    suggestions = await ai_service.suggest_cleaning(stats, column_analysis)
    return {"dataset_id": dataset_id, "suggestions": suggestions}

@router.post("/suggest-features")
async def suggest_features(dataset_id: str, target: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    df = await get_dataset_sample(dataset_id, db)
    column_analysis = await ai_service.analyze_columns(df)
    suggestions = await feature_suggester.suggest_features(column_analysis, target)
    return {"dataset_id": dataset_id, "suggestions": suggestions}

@router.post("/suggest-model")
async def suggest_model(dataset_id: str, target: str, task_type: str = "classification", db: AsyncSession = Depends(get_db)):
    df = await get_dataset_sample(dataset_id, db)
    column_analysis = await ai_service.analyze_columns(df)
    suggestions = await ai_service.suggest_models(
        len(df), len(df.columns), target, task_type, column_analysis
    )
    return {"dataset_id": dataset_id, "suggestions": suggestions}

import uuid
from app.models.activity import ActivityLog

@router.post("/auto-clean")
async def ai_auto_clean(dataset_id: str, db: AsyncSession = Depends(get_db)):
    """
    Asks Gemini to generate cleaning code and executes it on the dataset.
    """
    # 1. Fetch the dataset
    result = await db.execute(select(Dataset).filter(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    # 2. Get sample and analysis
    df = await get_dataset_sample(dataset_id, db)
    column_analysis = await ai_service.analyze_columns(df)
    
    # 3. Generate cleaning code
    cleaning_code = await ai_service.generate_cleaning_code(df, column_analysis)
    
    temp_path = None
    try:
        # 4. Load full dataset
        storage_svc = get_storage_service()
        temp_path = f"temp_full_{dataset.filename}"
        storage_svc.download_file(dataset.storage_path, temp_path)
        
        full_df = pd.read_csv(temp_path) if dataset.file_type == 'csv' else pd.read_parquet(temp_path)
        
        # 5. Execute generated code safely-ish
        local_scope = {"pd": pd, "df": full_df}
        exec(cleaning_code, {}, local_scope)
        
        if "clean_data" in local_scope:
            cleaned_df = local_scope["clean_data"](full_df)
        else:
            # Try to find any function or assume it modified df in place
            cleaned_df = full_df
            
        # 6. Save cleaned dataset
        cleaned_dataset_id = str(uuid.uuid4())
        cleaned_filename = f"{cleaned_dataset_id}_ai_cleaned.{dataset.file_type}"
        cleaned_file_path = os.path.join("uploads", cleaned_filename)
        
        if dataset.file_type == 'csv':
            cleaned_df.to_csv(cleaned_file_path, index=False)
        else:
            cleaned_df.to_parquet(cleaned_file_path)
            
        new_dataset = Dataset(
            id=cleaned_dataset_id,
            user_id=dataset.user_id,
            filename=cleaned_filename,
            original_filename=f"AI_Cleaned_{dataset.original_filename}",
            file_size=os.path.getsize(cleaned_file_path),
            file_type=dataset.file_type,
            row_count=len(cleaned_df),
            column_count=len(cleaned_df.columns),
            storage_path=cleaned_file_path,
            metadata_={"parent_dataset_id": str(dataset.id), "ai_generated_code": cleaning_code}
        )
        db.add(new_dataset)
        
        # Log activity
        activity = ActivityLog(
            dataset_id=dataset.id,
            action_type="ai_cleaning",
            description="Performed AI-driven autonomous cleaning.",
            details={"cleaned_dataset_id": cleaned_dataset_id}
        )
        db.add(activity)
        
        await db.commit()
        
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
            
        return {
            "message": "AI Auto-cleaning successful",
            "cleaned_dataset_id": cleaned_dataset_id,
            "code_used": cleaning_code
        }
        
    except Exception as e:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"AI Cleaning execution failed: {str(e)}")

@router.post("/chat")
async def chat_with_ai(question: str, dataset_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    context = {}
    if dataset_id:
        try:
            df = await get_dataset_sample(dataset_id, db)
            context = {
                "columns": df.columns.tolist(),
                "shape": df.shape,
                "head": df.head(3).to_dict()
            }
        except Exception:
            pass
    
    response = await ai_service.chat(question, context)
    return {"response": response}

