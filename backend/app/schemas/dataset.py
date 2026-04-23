from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Any, Dict
from datetime import datetime
from uuid import UUID

class DatasetBase(BaseModel):
    filename: str
    original_filename: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    row_count: Optional[int] = None
    column_count: Optional[int] = None
    storage_path: Optional[str] = None
    metadata_: Optional[Dict[str, Any]] = None

class DatasetCreate(DatasetBase):
    pass

class DatasetUpdate(DatasetBase):
    filename: Optional[str] = None
    original_filename: Optional[str] = None

class DatasetInDBBase(DatasetBase):
    id: UUID
    user_id: Optional[UUID] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class Dataset(DatasetInDBBase):
    pass
