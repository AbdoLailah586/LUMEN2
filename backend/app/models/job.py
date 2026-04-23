from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, func, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id = Column(Uuid(as_uuid=True), ForeignKey("datasets.id"))
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"))
    job_type = Column(String(50))
    status = Column(String(50))
    progress = Column(Float, default=0.0)
    config = Column(JSONB)
    results = Column(JSONB)
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))

    owner = relationship("User", back_populates="jobs")
    dataset = relationship("Dataset", back_populates="jobs")
    models = relationship("Model", back_populates="job")
