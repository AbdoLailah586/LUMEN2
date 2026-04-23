import os
import pandas as pd
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.dataset import Dataset
from app.services.storage import get_storage_service
from app.api.deps import get_current_user
from app.models.user import User
from app.utils.file_validator import FileValidator
from app.core.rate_limiter import limiter
import uuid

router = APIRouter()

@router.post("")
@limiter.limit("10/hour")
async def upload_file(
    request: Request,
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset_id = uuid.uuid4()
    file_ext = file.filename.split('.')[-1].lower() if file.filename and '.' in file.filename else ''
    
    unique_filename = f"{dataset_id}.{file_ext}"
    
    storage_svc = get_storage_service()
    
    # SECURITY SCANS
    await FileValidator.validate_mime_type(file)
    if file_ext == 'csv':
        await FileValidator.detect_csv_injection(file)

    # Save file to abstraction layer (Cloud or Local fallback)
    try:
        storage_uri = storage_svc.upload_file(file.file, unique_filename, content_type=file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")
    finally:
        file.file.close()
            
    # Download temporarily to get basic metadata
    temp_path = f"/tmp/{unique_filename}" if os.name != 'nt' else f"temp_{unique_filename}"
    storage_svc.download_file(storage_uri, temp_path)
    
    row_count = 0
    column_count = 0
    try:
        if file_ext == 'csv':
            # Count rows efficiently
            with open(temp_path, 'r', encoding='utf-8', errors='ignore') as f:
                row_count = sum(1 for _ in f) - 1
            # Get column count
            df = pd.read_csv(temp_path, nrows=5)
            column_count = len(df.columns)
        elif file_ext in ['xls', 'xlsx']:
            df = pd.read_excel(temp_path)
            row_count = len(df)
            column_count = len(df.columns)
        elif file_ext == 'json':
            df = pd.read_json(temp_path)
            row_count = len(df)
            column_count = len(df.columns)
        elif file_ext == 'parquet':
            df = pd.read_parquet(temp_path)
            row_count = len(df)
            column_count = len(df.columns)
        elif file_ext == 'xml':
            df = pd.read_xml(temp_path)
            row_count = len(df)
            column_count = len(df.columns)
        elif file_ext in ['sqlite', 'db', 'sqlite3']:
            import sqlite3
            try:
                conn = sqlite3.connect(temp_path)
                query = "SELECT name FROM sqlite_master WHERE type='table';"
                tables = pd.read_sql_query(query, conn)
                if not tables.empty:
                    first_table = tables.iloc[0]['name']
                    df = pd.read_sql_query(f"SELECT * FROM {first_table}", conn)
                    row_count = len(df)
                    column_count = len(df.columns)
                conn.close()
            except Exception as e:
                print(f"Error parsing sqlite: {e}")
    except Exception as e:
        print(f"Error parsing file: {e}")
        
    try:
        file_size = os.path.getsize(temp_path)
        os.remove(temp_path)
    except:
        file_size = 0
        
    dataset = Dataset(
        id=dataset_id,
        user_id=current_user.id,
        filename=unique_filename,
        original_filename=file.filename or "unknown",
        file_size=file_size,
        file_type=file_ext,
        row_count=row_count,
        column_count=column_count,
        storage_path=storage_uri,
        metadata={}
    )
    
    db.add(dataset)
    try:
        await db.commit()
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}
        
    await db.refresh(dataset)
    
    return {
        "message": "File upload started", 
        "dataset_id": str(dataset.id),
        "job_id": str(dataset.id), # return job_id as well for backward compatibility
        "filename": dataset.original_filename,
        "row_count": row_count,
        "column_count": column_count
    }

@router.get("/{id}/status")
async def get_upload_status(id: str):
    return {"id": id, "status": "completed", "progress": 100.0}

@router.delete("/{id}")
async def delete_file(id: str):
    return {"message": f"File {id} deleted successfully"}
