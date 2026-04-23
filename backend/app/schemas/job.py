from pydantic import BaseModel, ConfigDict
from typing import Optional, Any, Dict
from datetime import datetime
from uuid import UUID

class JobBase(BaseModel):
    job_type: str
    status: str = "pending"
    progress: float = 0.0
    config: Optional[Dict[str, Any]] = None
    results: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

class JobCreate(JobBase):
    dataset_id: Optional[UUID] = None

class JobUpdate(JobBase):
    job_type: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[float] = None

class JobInDBBase(JobBase):
    id: UUID
    dataset_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

class Job(JobInDBBase):
    pass
