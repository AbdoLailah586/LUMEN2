from pydantic import BaseModel, ConfigDict
from typing import Optional, Any, Dict
from datetime import datetime
from uuid import UUID

class ModelBase(BaseModel):
    model_name: Optional[str] = None
    model_type: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    parameters: Optional[Dict[str, Any]] = None
    storage_path: Optional[str] = None
    is_best: bool = False
    mlflow_run_id: Optional[str] = None

class ModelCreate(ModelBase):
    job_id: Optional[UUID] = None
    dataset_id: Optional[UUID] = None

class ModelUpdate(ModelBase):
    pass

class ModelInDBBase(ModelBase):
    id: UUID
    job_id: Optional[UUID] = None
    dataset_id: Optional[UUID] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class Model(ModelInDBBase):
    pass
