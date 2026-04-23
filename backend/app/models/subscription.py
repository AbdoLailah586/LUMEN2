from sqlalchemy import Column, String, DateTime, func, Uuid, ForeignKey, Boolean
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"))
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    tier = Column(String(50), default="free") # free, pro, team, enterprise
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Feature Toggling properties inferred by the Enum (tier) but could also be explicitly cast
    # e.g., max_upload_size = Column(...)
