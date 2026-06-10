from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
import os

from app.core.database import get_db
from app.models.dataset import Dataset
from app.services.cleaning.dataset_loader import (
    load_dataset_dataframe,
    build_dataset_summary,
    compute_preview_changes,
)
from app.services.cleaning.fusion_engine import FusionEngine

router = APIRouter()

PREVIEW_SAMPLE_ROWS = 200
PREVIEW_DISPLAY_ROWS = 8

class CleaningConfig(BaseModel):
    drop_columns: List[str] = []
    missing_strategy: str = "none"
    missing_fill_value: Optional[str] = None
    column_strategies: Dict[str, str] = {}
    column_fill_values: Dict[str, str] = {}
    column_type_conversions: Dict[str, str] = {}
    outlier_method: str = "none"
    outlier_action: str = "clip"
    outlier_threshold: float = 3.0
    scaling_method: str = "none"
    encoding_method: str = "none"
    drop_duplicates: bool = False
    apply_log_transform: bool = False
    strip_whitespace: bool = False
    lowercase_text: bool = False


class CleaningPreviewRequest(CleaningConfig):
    sample_rows: int = Field(default=PREVIEW_SAMPLE_ROWS, ge=10, le=2000)


async def _get_dataset_or_404(dataset_id: str, db: AsyncSession) -> Dataset:
    result = await db.execute(select(Dataset).filter(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.post("/{dataset_id}/preview")
async def preview_cleaning(
    dataset_id: str,
    config: CleaningPreviewRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Dry-run cleaning on a sample of rows. Returns before/after summaries without saving.
    """
    dataset = await _get_dataset_or_404(dataset_id, db)

    try:
        df = load_dataset_dataframe(dataset, nrows=config.sample_rows)
        before = build_dataset_summary(df, sample_size=PREVIEW_DISPLAY_ROWS)

        cleaned_df, steps_log = FusionEngine.apply_pipeline(df, config.model_dump())
        after = build_dataset_summary(cleaned_df, sample_size=PREVIEW_DISPLAY_ROWS)
        changes = compute_preview_changes(before, after)

        return {
            "before": before,
            "after": after,
            "steps": steps_log,
            "changes": changes,
            "preview_note": f"Preview based on first {len(df)} rows of the dataset.",
        }
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=500,
            detail=f"Preview failed: {str(e)}\n\n{traceback.format_exc()}",
        )


@router.post("/{dataset_id}/apply")
async def apply_cleaning(
    dataset_id: str, 
    config: CleaningConfig,
    db: AsyncSession = Depends(get_db)
):
    """
    Applies data cleaning operations to a dataset using pandas.
    """
    dataset = await _get_dataset_or_404(dataset_id, db)

    try:
        df = load_dataset_dataframe(dataset)
        file_ext = dataset.file_type
        df, steps_log = FusionEngine.apply_pipeline(df, config.model_dump())

        # Save the Cleaned Dataset
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

