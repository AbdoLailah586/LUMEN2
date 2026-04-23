import abc
from ast import Bytes
from typing import BinaryIO, Optional

class StorageService(abc.ABC):
    """
    Abstract Base Class for Storage definitions.
    Enforces a consistent interface whether backing by S3, GCS, or Local OS.
    """
    
    @abc.abstractmethod
    def upload_file(self, file_obj: BinaryIO, destination_path: str, content_type: str = None) -> str:
        """Uploads a file and returns its storage URI."""
        pass
        
    @abc.abstractmethod
    def download_file(self, source_path: str, local_destination: str) -> bool:
        """Downloads a file to a local path."""
        pass
        
    @abc.abstractmethod
    def delete_file(self, file_path: str) -> bool:
        """Deletes a file."""
        pass
        
    @abc.abstractmethod
    def get_signed_url(self, file_path: str, expiration_minutes: int = 15) -> str:
        """Gets a securely signed short-lived URL for downloading."""
        pass
