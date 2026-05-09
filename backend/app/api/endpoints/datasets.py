from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Any, Dict
import os
import uuid

from app.schemas.dataset import Dataset, DatasetCreate
from app.models.dataset import Dataset as DatasetModel
from app.models.activity import ActivityLog as ActivityLogModel
from app.core.database import get_db
from app.core.config import settings
from app.services.storage import get_storage_service
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/", response_model=Dataset)
async def create_dataset(
    *,
    db: AsyncSession = Depends(get_db),
    dataset_in: DatasetCreate,
) -> Any:
    """
    Create new dataset entry.
    """
    db_dataset = DatasetModel(**dataset_in.model_dump())
    db.add(db_dataset)
    await db.commit()
    await db.refresh(db_dataset)
    return db_dataset

@router.get("/", response_model=List[Dataset])
async def read_datasets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve datasets for the current user only.
    """
    result = await db.execute(
        select(DatasetModel)
        .where(DatasetModel.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    datasets = result.scalars().all()
    return datasets

@router.get("/{dataset_id}", response_model=Dataset)
async def read_dataset(
    dataset_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get dataset by ID (only if owned by current user).
    """
    result = await db.execute(
        select(DatasetModel).filter(
            DatasetModel.id == uuid.UUID(dataset_id),
            DatasetModel.user_id == current_user.id
        )
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

@router.get("/{dataset_id}/preview")
async def get_dataset_preview(
    dataset_id: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Generate a preview of the dataset including columns, types, missing values, and the first 5 rows.
    """
    import pandas as pd
    import json
    
    result = await db.execute(select(DatasetModel).filter(DatasetModel.id == uuid.UUID(dataset_id)))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        storage_uri = dataset.storage_path
        file_ext = dataset.file_type
        
        storage_svc = get_storage_service()
        temp_path = f"/tmp/{dataset.filename}" if os.name != 'nt' else f"temp_{dataset.filename}"
        storage_svc.download_file(storage_uri, temp_path)
        file_path = temp_path
        
        if file_ext == 'csv':
            df = pd.read_csv(file_path, nrows=50)
        elif file_ext in ['xls', 'xlsx']:
            df = pd.read_excel(file_path, nrows=50)
        elif file_ext == 'json':
            df = pd.read_json(file_path)
            df = df.head(50)
        elif file_ext == 'parquet':
            df = pd.read_parquet(file_path)
            df = df.head(50)
        elif file_ext == 'xml':
            df = pd.read_xml(file_path)
            df = df.head(50)
        elif file_ext in ['sqlite', 'db', 'sqlite3']:
            import sqlite3
            conn = sqlite3.connect(file_path)
            query = "SELECT name FROM sqlite_master WHERE type='table';"
            tables = pd.read_sql_query(query, conn)
            if not tables.empty:
                first_table = tables.iloc[0]['name']
                df = pd.read_sql_query(f"SELECT * FROM {first_table} LIMIT 50", conn)
            else:
                df = pd.DataFrame()
            conn.close()
        else:
            raise ValueError(f"Unsupported file extension: {file_ext}")
            
        columns_info = []
        for col in df.columns:
            columns_info.append({
                "name": col,
                "type": str(df[col].dtype),
                "missing": int(df[col].isna().sum())
            })
            
        try:
            os.remove(temp_path)
        except Exception:
            pass
            
        return {
            "columns": columns_info,
            "data": json.loads(df.head(5).to_json(orient='records', date_format='iso'))
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading dataset file: {str(e)}")

@router.get("/{dataset_id}/profile")
async def get_dataset_profile(
    dataset_id: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Generate a detailed profile of the dataset for visualizations.
    """
    import pandas as pd
    import json
    import numpy as np
    
    result = await db.execute(select(DatasetModel).filter(DatasetModel.id == uuid.UUID(dataset_id)))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        storage_uri = dataset.storage_path
        file_ext = dataset.file_type
        
        storage_svc = get_storage_service()
        temp_path = f"/tmp/{dataset.filename}" if os.name != 'nt' else f"temp_{dataset.filename}"
        storage_svc.download_file(storage_uri, temp_path)
        file_path = temp_path
        
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
            raise HTTPException(status_code=400, detail=f"Unsupported file extension: {file_ext}")
            
        profile = []
        for col in df.columns:
            col_data = df[col]
            is_numeric = pd.api.types.is_numeric_dtype(col_data)
            
            stats = {
                "name": col,
                "type": str(col_data.dtype),
                "missing": int(col_data.isna().sum()),
                "unique": int(col_data.nunique())
            }
            
            # For visualizations
            if is_numeric:
                stats["is_numeric"] = True
                stats["min"] = float(col_data.min()) if pd.notna(col_data.min()) else None
                stats["max"] = float(col_data.max()) if pd.notna(col_data.max()) else None
                stats["mean"] = float(col_data.mean()) if pd.notna(col_data.mean()) else None
                
                # Histogram data
                clean_data = col_data.dropna()
                if len(clean_data) > 0:
                    counts, bins = np.histogram(clean_data, bins=20)
                    stats["histogram"] = {
                        "counts": [int(c) for c in counts],
                        "bins": [float(b) for b in bins]
                    }
                else:
                    stats["histogram"] = None
            else:
                stats["is_numeric"] = False
                # Value counts for categorical (top 10)
                val_counts = col_data.value_counts().head(10)
                stats["value_counts"] = {
                    "labels": [str(x) for x in val_counts.index.tolist()],
                    "values": [int(v) for v in val_counts.values.tolist()]
                }
                
            profile.append(stats)
            
        try:
            os.remove(temp_path)
        except Exception:
            pass
            
        return {
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "columns": profile
        }
        
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error profiling dataset: {str(e)}\n\n{traceback.format_exc()}")

@router.get("/{dataset_id}/eda")
async def get_dataset_eda(
    dataset_id: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Generate Advanced EDA including Correlation matrix.
    """
    import pandas as pd
    
    result = await db.execute(select(DatasetModel).filter(DatasetModel.id == uuid.UUID(dataset_id)))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        storage_uri = dataset.storage_path
        file_ext = dataset.file_type
        
        storage_svc = get_storage_service()
        temp_path = f"/tmp/{dataset.filename}" if os.name != 'nt' else f"temp_{dataset.filename}"
        storage_svc.download_file(storage_uri, temp_path)
        file_path = temp_path
        
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
            raise HTTPException(status_code=400, detail=f"Unsupported file extension: {file_ext}")
            
        numeric_df = df.select_dtypes(include=['number'])
        if numeric_df.empty:
            return {"correlation": [], "features": []}
            
        corr_matrix = numeric_df.corr().replace({float('nan'): None})
        
        corr_data = []
        for col in corr_matrix.columns:
            row_data = {"feature": str(col)}
            for inner_col in corr_matrix.columns:
                val = corr_matrix.at[col, inner_col]
                row_data[str(inner_col)] = float(val) if val is not None else None
            corr_data.append(row_data)
            
        try:
            os.remove(temp_path)
        except Exception:
            pass
            
        return {
            "correlation": corr_data,
            "features": [str(c) for c in corr_matrix.columns]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{dataset_id}/activities")
async def get_dataset_activities(
    dataset_id: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Retrieve activity history for a dataset.
    """
    result = await db.execute(select(ActivityLogModel).filter(ActivityLogModel.dataset_id == uuid.UUID(dataset_id)).order_by(ActivityLogModel.created_at.desc()))
    activities = result.scalars().all()
    # Return as dicts explicitly since we don't have schema import here yet, or rely on FastAPI parsing
    return [{
        "id": str(a.id),
        "dataset_id": str(a.dataset_id),
        "action_type": a.action_type,
        "description": a.description,
        "details": a.details,
        "created_at": a.created_at
    } for a in activities]

@router.post("/{dataset_id}/plot-interpretation")
async def get_plot_interpretation(
    dataset_id: str,
    plot_data: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Given plot data, request an AI interpretation using Gemini.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return {"interpretation": f"Based on the data metrics provided, we see significant variances. Please add GEMINI_API_KEY to your .env file to unlock advanced AI-powered interpretations."}
        
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        
        # Prepare a prompt based on the plot_data stats
        plot_type = plot_data.get("type", "Generic Plot")
        stats = plot_data.get("stats", {})
        
        prompt = f"You are a Senior Data Scientist analyzing an Exploratory Data Analysis plot. Provide a very concise, 2-3 sentence interpretation of this {plot_type}.\n\nContext Metrics:\n{stats}"
        
        # Use the supported 2.5 flash model
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        
        return {"interpretation": response.text.strip()}
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return {"interpretation": "AI was unable to generate an interpretation due to an error."}
@router.delete("/{dataset_id}")
async def delete_dataset(
    dataset_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Delete dataset (only if owned by current user).
    """
    result = await db.execute(
        select(DatasetModel).filter(
            DatasetModel.id == uuid.UUID(dataset_id),
            DatasetModel.user_id == current_user.id
        )
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    # Delete from storage
    try:
        storage_svc = get_storage_service()
        storage_svc.delete_file(dataset.storage_path)
    except Exception as e:
        print(f"Error deleting file: {e}")
        
    await db.delete(dataset)
    await db.commit()
    return {"message": "Dataset deleted successfully"}

@router.get("/{dataset_id}/download")
async def download_dataset(
    dataset_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get a secure download link for the dataset (only if owned by current user).
    """
    result = await db.execute(
        select(DatasetModel).filter(
            DatasetModel.id == uuid.UUID(dataset_id),
            DatasetModel.user_id == current_user.id
        )
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    storage_svc = get_storage_service()
    signed_url = storage_svc.get_signed_url(dataset.storage_path)
    
    if not signed_url:
        # Fallback to local path if signed URL fails (for local development)
        return {"download_url": f"/api/upload/file/{dataset.filename}"}
        
    return {"download_url": signed_url}
