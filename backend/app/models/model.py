from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, func, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base

class Model(Base):
    __tablename__ = "models"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(Uuid(as_uuid=True), ForeignKey("jobs.id"))
    dataset_id = Column(Uuid(as_uuid=True), ForeignKey("datasets.id"))
    model_name = Column(String(100))
    model_type = Column(String(50))
    metrics = Column(JSONB)
    parameters = Column(JSONB)
    storage_path = Column(String(500))
    is_best = Column(Boolean, default=False)
    mlflow_run_id = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job = relationship("Job", back_populates="models")
    dataset = relationship("Dataset", back_populates="models")
