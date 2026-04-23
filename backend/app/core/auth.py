"""
JWT, API Key, and Role-Based Access Control logic for LUMEN.
"""
import jwt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, Security, Depends
from fastapi.security import OAuth2PasswordBearer, APIKeyHeader
import os

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback-dev-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 week

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

class AuthService:
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
        """Generates a JWT access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def decode_access_token(token: str):
        """Decodes and validates a JWT token."""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Signature has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(
    token: str = Depends(oauth2_scheme), 
    api_key: str = Security(api_key_header)
):
    """
    Dependency to get the current user via JWT or API Key.
    """
    if api_key:
        # Validate API Key against DB
        # user = DB.get_user_by_api_key(api_key)
        # if not user: raise HTTPException(...)
        return {"user_id": "api_user", "role": "admin"}
        
    if token:
        payload = AuthService.decode_access_token(token)
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
        return {"user_id": user_id, "role": role}
        
    raise HTTPException(status_code=401, detail="Not authenticated")

def require_role(required_roles: list[str]):
    """
    Dependency generator for RBAC.
    Usage: @router.get("/admin", dependencies=[Depends(require_role(["admin"]))])
    """
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in required_roles:
            raise HTTPException(status_code=403, detail="Operation not permitted")
        return current_user
    return role_checker

# Helper for standard active user
def get_current_active_user(current_user: dict = Depends(get_current_user)):
    # You would typically check if user.disabled == True here
    return current_user
