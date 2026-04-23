import os
from .local import LocalStorageService
from .s3 import S3StorageService
from .base import StorageService

def get_storage_service() -> StorageService:
    """Factory to get the configured storage service."""
    provider = os.getenv("STORAGE_PROVIDER", "local").lower()
    
    if provider == "s3":
        return S3StorageService()
    else:
        return LocalStorageService()
