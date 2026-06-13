from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "LUMEN AutoML Platform"
    API_V1_STR: str = "/api"
    
    # Database configuration
    DATABASE_URL: str = "sqlite:///./lumen.db"
    
    # Redis configuration
    REDIS_URL: str = "redis://localhost:6379"
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"
    JWT_SECRET_KEY: str = "your-jwt-secret-key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Files
    MAX_UPLOAD_SIZE: int = 104857600  # 100MB
    UPLOAD_DIR: str = "./uploads"

    # AI
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-flash-latest"
    GEMINI_TEMPERATURE: float = 0.2

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None

    # MLflow
    MLFLOW_TRACKING_URI: str = "http://localhost:5000"
    MLFLOW_EXPERIMENT_NAME: str = "lumen"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
