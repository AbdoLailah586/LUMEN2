"""
API Endpoints for configuring the generic pipelines manually.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import pprint

# Assume local module imports corresponding to the services we wrote.
from app.services.cleaning.generic_cleaner import GenericDataCleaner
from app.services.features.generic_engineer import FeatureEngineer
from app.services.ml.generic_trainer import GenericTrainer
from app.core.auth import get_current_active_user # Mocked dependency

router = APIRouter(prefix="/api/controls", tags=["User Controls"])

class CleaningConfigRequest(BaseModel):
    dataset_id: str
    imputation: Dict[str, str] = Field(..., example={"numerical": "mean", "categorical": "mode"})
    outliers: Dict[str, Any] = Field(..., example={"method": "zscore", "zscore_threshold": 3.0, "action": "cap"})

class FeatureConfigRequest(BaseModel):
    dataset_id: str
    scaling: str = "standard"
    encoding: str = "onehot"
    datetime_extraction: List[str] = ["year", "month"]
    text_features: List[str] = ["length"]
    
class TrainingConfigRequest(BaseModel):
    dataset_id: str
    target_column: str
    is_classification: Optional[bool] = None
    cv_folds: int = 5
    selected_models: List[str] = ["RandomForest", "XGBoost"]

@router.post("/cleaning/custom")
async def apply_custom_cleaning(
    config: CleaningConfigRequest,
    # current_user = Depends(get_current_active_user)
):
    """
    Applies custom user-defined cleaning configs to the dataset.
    """
    try:
        # In a real app we fetch 'df' and 'column_types' from DB via dataset_id
        # df = DB.get_dataframe(config.dataset_id)
        # c_types = DB.get_inferred_types(config.dataset_id)
        
        cleaner = GenericDataCleaner(config={"imputation": config.imputation, "outliers": config.outliers})
        # df_clean = cleaner.clean(df, c_types)
        # DB.save_dataframe(config.dataset_id, df_clean)
        
        return {"status": "success", "message": "Cleaning applied successfully based on custom configuration."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/features/custom")
async def apply_custom_features(
    config: FeatureConfigRequest,
    # current_user = Depends(get_current_active_user)
):
    """
    Applies custom user-defined feature engineering.
    """
    try:
        engineer = FeatureEngineer(config=config.dict(exclude={"dataset_id"}))
        # df_engineered = engineer.transform(df, c_types)
        
        return {"status": "success", "message": "Feature engineering applied successfully."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/training/custom")
async def apply_custom_training(
    config: TrainingConfigRequest,
    background_tasks: BackgroundTasks,
    # current_user = Depends(get_current_active_user)
):
    """
    Dispatches a training job with custom user parameters.
    """
    def _train_task():
        trainer = GenericTrainer(
            target_column=config.target_column, 
            is_classification=config.is_classification, 
            cv_folds=config.cv_folds
        )
        # results = trainer.train(X, y, models_config={"selected_models": config.selected_models})
        # return results
        
    background_tasks.add_task(_train_task)
    return {"status": "queued", "message": "Training job queued in background.", "job_id": "mock_id"}

@router.get("/models/params")
async def get_model_params(model_name: str):
    """
    Returns available hyperparameter ranges for a given model.
    """
    params = {
        "RandomForest": {"n_estimators": [10, 1000], "max_depth": [None, 10, 20, 50]},
        "XGBoost": {"learning_rate": [0.01, 1.0], "max_depth": [3, 10]},
        "LightGBM": {"num_leaves": [31, 127], "learning_rate": [0.01, 0.3]}
    }
    
    if model_name not in params:
        raise HTTPException(status_code=404, detail="Model hyperparameter spec not found.")
        
    return {"model": model_name, "parameters": params[model_name]}
