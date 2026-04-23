from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Uuid
from sqlalchemy.orm import relationship
import uuid
import datetime

from app.core.database import Base

class ActivityLog(Base):
    __tablename__ = "activities"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id = Column(Uuid(as_uuid=True), ForeignKey("datasets.id", ondelete="CASCADE"), index=True)
    action_type = Column(String, index=True) # e.g. cleaning, eda, training
    description = Column(String)
    details = Column(JSON) # To store step-by-step lists or additional context
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    dataset = relationship("Dataset", back_populates="activities")
