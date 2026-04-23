from sqlalchemy import Column, String, Integer, BigInteger, DateTime, ForeignKey, func, Uuid, JSON
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(BigInteger)
    file_type = Column(String(50))
    row_count = Column(Integer)
    column_count = Column(Integer)
    storage_path = Column(String(500))
    metadata_ = Column("metadata", JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="datasets")
    jobs = relationship("Job", back_populates="dataset", cascade="all, delete")
    models = relationship("Model", back_populates="dataset", cascade="all, delete")
    activities = relationship("ActivityLog", back_populates="dataset", cascade="all, delete")
