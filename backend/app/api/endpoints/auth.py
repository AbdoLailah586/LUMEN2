from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx

from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.config import settings

router = APIRouter()

@router.post("/register")
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Create new user.
    """
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalar_one_or_none()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system",
        )
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"message": "User successfully registered"}


@router.post("/login/access-token")
async def login_access_token(
    db: AsyncSession = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = await db.scalar(select(User).where(User.email == form_data.username))
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if not user.hashed_password:
        raise HTTPException(
            status_code=400, 
            detail="This account uses Google Sign-In. Please use the 'Sign in with Google' button."
        )
        
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            subject=str(user.id), expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }


@router.post("/login/google")
async def login_with_google(
    credential: dict,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Authenticate with Google OAuth. Receives the Google ID token credential,
    verifies it, and returns a JWT access token. Auto-registers new users.
    """
    token = credential.get("credential")
    if not token:
        raise HTTPException(status_code=400, detail="Google credential is required")

    # Verify the Google ID token using Google's tokeninfo endpoint
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"
        )

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    google_info = response.json()

    # Validate the token audience matches our client ID (if configured)
    if settings.GOOGLE_CLIENT_ID and google_info.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Token audience mismatch")

    google_id = google_info.get("sub")
    email = google_info.get("email")
    full_name = google_info.get("name", "")
    avatar_url = google_info.get("picture", "")

    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by Google")

    # Check if user already exists (by google_id or email)
    user = await db.scalar(
        select(User).where((User.google_id == google_id) | (User.email == email))
    )

    if user:
        # Link google_id if not already linked
        if not user.google_id:
            user.google_id = google_id
        if not user.avatar_url and avatar_url:
            user.avatar_url = avatar_url
        await db.commit()
        await db.refresh(user)
    else:
        # Auto-register new Google user
        user = User(
            email=email,
            full_name=full_name,
            google_id=google_id,
            avatar_url=avatar_url,
            hashed_password=None,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            subject=str(user.id), expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

