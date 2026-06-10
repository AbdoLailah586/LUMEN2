from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.job import Job
from app.models.dataset import Dataset
from app.models.model import Model as DbModel
from app.services.ml.job_dispatch import dispatch_training_job
from datetime import datetime, timezone
import uuid

router = APIRouter()

@router.get("/{dataset_id}/recommend-models")
async def recommend_models(dataset_id: str, db: AsyncSession = Depends(get_db)):
    """
    Analyzes the dataset and recommends suitable machine learning models.
    """
    result = await db.execute(select(Dataset).filter(Dataset.id == uuid.UUID(dataset_id)))
    dataset = result.scalar_one_or_none()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        import pandas as pd
        file_path = dataset.storage_path
        
        # Determine file type
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path, nrows=1000)
        elif file_path.endswith('.parquet'):
            df = pd.read_parquet(file_path)
            df = df.head(1000)
        elif file_path.endswith('.json'):
            df = pd.read_json(file_path)
        else:
            return {"recommendations": [{"model": "AutoML", "status": "recommended", "reason": "Standard AutoML pipeline is versatile for any supported tabular dataset."}]}
            
        rows = dataset.row_count
        cols = dataset.column_count
        
        # Basic heuristic analysis
        numeric_cols = len(df.select_dtypes(include=['number']).columns)
        cat_cols = len(df.select_dtypes(exclude=['number']).columns)
        has_categorical = cat_cols > 0
        is_large = rows > 50000
        is_small = rows < 1000
        is_high_dim = cols > 50
        
        recommendations = []
        
        # Tree-based
        if has_categorical or not is_high_dim:
            recommendations.append({
                "model": "Random Forest",
                "status": "highly_recommended",
                "reason": "Excellent for handling mixed data types and robust to overfitting. Performs well out of the box."
            })
            recommendations.append({
                "model": "XGBoost",
                "status": "highly_recommended" if is_large else "recommended",
                "reason": "State-of-the-art accuracy. Extremely fast and well-suited for tabular data."
            })
        
        # Linear models
        if numeric_cols > 0 and not has_categorical and not is_high_dim:
            recommendations.append({
                "model": "Linear/Logistic Regression",
                "status": "recommended",
                "reason": "Good baseline model. Highly interpretable and fast."
            })
        else:
            recommendations.append({
                "model": "Linear/Logistic Regression",
                "status": "not_recommended",
                "reason": "May struggle to capture non-linear relationships and requires extensive feature scaling/encoding for mixed types."
            })
            
        # SVM
        if is_small and numeric_cols > 0:
            recommendations.append({
                "model": "Support Vector Machine",
                "status": "recommended",
                "reason": "Effective in high dimensional spaces and relatively small dataset sizes."
            })
        elif is_large:
            recommendations.append({
                "model": "Support Vector Machine",
                "status": "not_recommended",
                "reason": "Training time can be prohibitively slow on datasets with over 50,000 rows."
            })
            
        # Neural Network
        if is_large:
            recommendations.append({
                "model": "Deep Neural Network",
                "status": "recommended",
                "reason": "With a large amount of data, deep learning models can potentially find complex hidden patterns."
            })
        else:
            recommendations.append({
                "model": "Deep Neural Network",
                "status": "not_recommended",
                "reason": "Deep neural nets require very large datasets to outperform tree-based methods and are prone to overfitting here."
            })
            
        return {"recommendations": recommendations}
        
    except Exception as e:
        print(f"Heuristics Error: {e}")
        return {"recommendations": [{"model": "AutoML", "status": "recommended", "reason": "Standard AutoML pipeline is versatile for any supported tabular dataset."}]}

@router.post("/{dataset_id}/start")
async def start_training(dataset_id: str, config: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    # Verify dataset exists
    result = await db.execute(select(Dataset).filter(Dataset.id == uuid.UUID(dataset_id)))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    job_id = str(uuid.uuid4())
    job = Job(
        id=job_id,
        dataset_id=uuid.UUID(dataset_id),
        user_id=dataset.user_id,
        job_type="training",
        status="pending",
        progress=0.0,
        config=config,
        results={
            "training_log": [{
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "type": "system",
                "message": "Training job created. Starting worker...",
            }]
        },
    )
    db.add(job)
    await db.commit()

    execution_mode = dispatch_training_job(job_id)

    return {
        "message": "Training job started",
        "job_id": job_id,
        "execution_mode": execution_mode,
    }

@router.get("/jobs/{id}/status")
async def get_training_job_status(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).filter(Job.id == uuid.UUID(id)))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    results = job.results or {}
    return {
        "job_id": str(job.id),
        "status": job.status,
        "progress": job.progress,
        "error": job.error_message,
        "training_log": results.get("training_log", []),
        "current_step": results.get("current_step"),
    }

@router.get("/jobs/{id}/results")
async def get_training_results(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).filter(Job.id == uuid.UUID(id)))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Job is not completed yet")
        
    results = job.results or {}
    return {
        "job_id": str(job.id),
        "metrics": results.get("metrics", {}),
        "feature_importance": results.get("feature_importance", {}),
        "model_id": results.get("model_id"),
        "task_type": results.get("training_summary", {}).get("task_type")
        or job.config.get("task_type", "classification"),
        "confusion_matrix": results.get("confusion_matrix"),
        "model_comparison": results.get("model_comparison", []),
        "best_model": results.get("best_model"),
        "metric_feedback": results.get("metric_feedback", []),
        "overall_recommendation": results.get("overall_recommendation"),
        "training_summary": results.get("training_summary", {}),
        "training_log": results.get("training_log", []),
        "config": job.config,
    }

@router.get("/models/{dataset_id}")
async def get_dataset_models(dataset_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DbModel).filter(DbModel.dataset_id == uuid.UUID(dataset_id)))
    models = result.scalars().all()
    return [{"id": str(m.id), "name": m.model_name, "metrics": m.metrics, "created_at": m.created_at} for m in models]
