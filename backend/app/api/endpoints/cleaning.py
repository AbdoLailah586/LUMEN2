from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import pandas as pd
import uuid
import os

from app.core.database import get_db
from app.models.dataset import Dataset

router = APIRouter()

class CleaningConfig(BaseModel):
    drop_columns: List[str] = []
    missing_strategy: str = "none"
    missing_fill_value: Optional[str] = None
    outlier_method: str = "none"
    outlier_action: str = "clip"
    outlier_threshold: float = 3.0
    scaling_method: str = "none"
    encoding_method: str = "none"
    drop_duplicates: bool = False
    apply_log_transform: bool = False

@router.post("/{dataset_id}/apply")
async def apply_cleaning(
    dataset_id: str, 
    config: CleaningConfig,
    db: AsyncSession = Depends(get_db)
):
    """
    Applies data cleaning operations to a dataset using pandas.
    """
    # 1. Fetch the dataset
    result = await db.execute(select(Dataset).filter(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        # 2. Load the dataset into pandas
        file_path = dataset.storage_path
        file_ext = dataset.file_type
        
        if file_ext == 'csv':
            df = pd.read_csv(file_path)
        elif file_ext in ['xls', 'xlsx']:
            df = pd.read_excel(file_path)
        elif file_ext == 'json':
            df = pd.read_json(file_path)
        elif file_ext == 'parquet':
            df = pd.read_parquet(file_path)
        elif file_ext == 'xml':
            df = pd.read_xml(file_path)
        elif file_ext in ['sqlite', 'db', 'sqlite3']:
            import sqlite3
            conn = sqlite3.connect(file_path)
            query = "SELECT name FROM sqlite_master WHERE type='table';"
            tables = pd.read_sql_query(query, conn)
            if not tables.empty:
                first_table = tables.iloc[0]['name']
                df = pd.read_sql_query(f"SELECT * FROM {first_table}", conn)
            else:
                df = pd.DataFrame()
            conn.close()
        else:
            raise ValueError(f"Unsupported file extension: {file_ext}")
            
        # 3. Apply Cleaning Operations
        from app.services.cleaning.fusion_engine import FusionEngine
        df, steps_log = FusionEngine.apply_pipeline(df, config.model_dump())
            
        # 4. Save the Cleaned Dataset
        cleaned_dataset_id = str(uuid.uuid4())
        cleaned_filename = f"{cleaned_dataset_id}_cleaned.{file_ext}"
        cleaned_file_path = os.path.join("uploads", cleaned_filename)
        
        if file_ext == 'csv':
            df.to_csv(cleaned_file_path, index=False)
        elif file_ext in ['xls', 'xlsx']:
            df.to_excel(cleaned_file_path, index=False)
        elif file_ext == 'json':
            df.to_json(cleaned_file_path)
        elif file_ext == 'parquet':
            df.to_parquet(cleaned_file_path)
        elif file_ext == 'xml':
            df.to_xml(cleaned_file_path, index=False)
        elif file_ext in ['sqlite', 'db', 'sqlite3']:
            import sqlite3
            conn = sqlite3.connect(cleaned_file_path)
            df.to_sql('cleaned_data', conn, index=False, if_exists='replace')
            conn.close()
            
        # 5. Create new database record for the cleaned dataset
        cleaned_dataset = Dataset(
            id=cleaned_dataset_id,
            user_id=dataset.user_id,
            filename=cleaned_filename,
            original_filename=f"Cleaned_{dataset.original_filename}",
            file_size=os.path.getsize(cleaned_file_path),
            file_type=file_ext,
            row_count=len(df),
            column_count=len(df.columns),
            storage_path=cleaned_file_path,
            metadata_={"parent_dataset_id": str(dataset.id), "cleaning_config": config.model_dump()}
        )
        
        db.add(cleaned_dataset)
        
        # 6. Create ActivityLog
        from app.models.activity import ActivityLog
        activity = ActivityLog(
            dataset_id=dataset.id,
            action_type="cleaning",
            description=f"Applied data cleaning. Performed {len(steps_log)} steps. Resulting shape: {len(df)} rows, {len(df.columns)} columns.",
            details={"steps": steps_log, "config": config.model_dump(), "cleaned_dataset_id": str(cleaned_dataset.id)}
        )
        db.add(activity)
        
        await db.commit()
        await db.refresh(cleaned_dataset)
        
        return {
            "message": "Data cleaning applied successfully", 
            "original_dataset_id": str(dataset.id),
            "cleaned_dataset_id": str(cleaned_dataset.id),
            "row_count": len(df),
            "column_count": len(df.columns)
        }
        
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Cleaning failed: {str(e)}\n\n{traceback.format_exc()}")

