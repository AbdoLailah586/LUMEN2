from sqlalchemy import Column, String, DateTime, func, Uuid, ForeignKey
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    owner_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # TODO: Add Organization-User relationship table for multi-tenancy (RBAC rules: Owner, Admin, Member, Viewer)
    
class OrganizationMember(Base):
    __tablename__ = "organization_members"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(Uuid(as_uuid=True), ForeignKey("organizations.id"))
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"))
    role = Column(String(50), default="viewer") # admin, member, viewer
    created_at = Column(DateTime(timezone=True), server_default=func.now())
