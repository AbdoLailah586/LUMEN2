"""
LUMEN CV Database Models — Tables for fine-tuned models and fine-tuning jobs.
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, func, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import uuid as _uuid

from app.core.database import Base


class CVFineTunedModel(Base):
    """Stores user-created fine-tuned CV models."""
    __tablename__ = "cv_fine_tuned_models"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=_uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"))
    base_model_slug = Column(String(100), nullable=False)
    num_classes = Column(Integer)
    class_names = Column(JSONB)
    num_epochs = Column(Integer)
    accuracy = Column(Float)
    storage_path = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="cv_fine_tuned_models")


class CVFineTuneJob(Base):
    """Tracks async fine-tuning and distillation jobs."""
    __tablename__ = "cv_fine_tune_jobs"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=_uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"))
    base_model_slug = Column(String(100), nullable=False)
    job_type = Column(String(50), default="fine_tune")  # "fine_tune" | "distillation"
    status = Column(String(50), default="pending")      # pending | running | completed | failed
    progress = Column(Float, default=0.0)
    config = Column(JSONB)
    results = Column(JSONB)
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))

    owner = relationship("User", back_populates="cv_fine_tune_jobs")
