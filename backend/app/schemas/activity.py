from pydantic import BaseModel, ConfigDict
from typing import Optional, Any, Dict
from datetime import datetime
from uuid import UUID

class ActivityLogBase(BaseModel):
    dataset_id: UUID
    action_type: str
    description: str
    details: Optional[Dict[str, Any]] = None

class ActivityLogCreate(ActivityLogBase):
    pass

class ActivityLog(ActivityLogBase):
    id: UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
