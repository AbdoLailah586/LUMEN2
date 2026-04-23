from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Any

from app.schemas.user import User, UserCreate, UserUpdate
from app.models.user import User as UserModel
from app.core.database import get_db

router = APIRouter()

@router.post("/", response_model=User)
async def create_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserCreate,
) -> Any:
    """
    Create new user.
    """
    from app.core.security import get_password_hash
    hashed_password = get_password_hash(user_in.password)
    db_user = UserModel(email=user_in.email, full_name=user_in.full_name, hashed_password=hashed_password)
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

@router.get("/", response_model=List[User])
async def read_users(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve users.
    """
    result = await db.execute(select(UserModel).offset(skip).limit(limit))
    users = result.scalars().all()
    return users
