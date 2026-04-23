import os
import shutil
from typing import BinaryIO
from fastapi import Request
from .base import StorageService

class LocalStorageService(StorageService):
    def __init__(self, base_dir="uploads"):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)
        # We need the request base URL for signed urls if we implement a local fake signed URL
        self.host_url = os.getenv("API_HOST_URL", "http://localhost:8000")

    def upload_file(self, file_obj: BinaryIO, destination_path: str, content_type: str = None) -> str:
        full_path = os.path.join(self.base_dir, destination_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        with open(full_path, "wb") as buffer:
            shutil.copyfileobj(file_obj, buffer)
            
        return full_path

    def download_file(self, source_path: str, local_destination: str) -> bool:
        try:
            dirname = os.path.dirname(local_destination)
            if dirname:
                os.makedirs(dirname, exist_ok=True)
            shutil.copy2(source_path, local_destination)
            return True
        except Exception as e:
            print(f"Error downloading local file {source_path}: {e}")
            return False

    def delete_file(self, file_path: str) -> bool:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False

    def get_signed_url(self, file_path: str, expiration_minutes: int = 15) -> str:
        # In a local environment, we can expose a dedicated download endpoint that checks a signature
        # For simplicity in local fallback, we just return the direct path or a dummy signed URL
        # e.g., assuming we have a route like GET /api/downloads?file={file_path}&sig=...
        return f"{self.host_url}/api/downloads/local?file={file_path}"
