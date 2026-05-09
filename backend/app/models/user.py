from sqlalchemy import Column, String, DateTime, func, Uuid
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)  # Nullable for Google OAuth users
    full_name = Column(String(255))
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    avatar_url = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    datasets = relationship("Dataset", back_populates="owner")
    jobs = relationship("Job", back_populates="owner")
    cv_fine_tuned_models = relationship("CVFineTunedModel", back_populates="owner")
    cv_fine_tune_jobs = relationship("CVFineTuneJob", back_populates="owner")
