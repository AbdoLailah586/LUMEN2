import os
import boto3
from botocore.exceptions import ClientError
from typing import BinaryIO
from .base import StorageService

class S3StorageService(StorageService):
    def __init__(self):
        self.bucket_name = os.getenv("AWS_S3_BUCKET")
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name=os.getenv("AWS_REGION", "us-east-1")
        )

    def upload_file(self, file_obj: BinaryIO, destination_path: str, content_type: str = None) -> str:
        extra_args = {}
        if content_type:
            extra_args['ContentType'] = content_type
            
        self.s3_client.upload_fileobj(
            file_obj,
            self.bucket_name,
            destination_path,
            ExtraArgs=extra_args
        )
        return f"s3://{self.bucket_name}/{destination_path}"

    def download_file(self, source_path: str, local_destination: str) -> bool:
        # handle s3:// bucket prefix if passed
        if source_path.startswith("s3://"):
            source_path = "/".join(source_path.split("/")[3:])
            
        try:
            self.s3_client.download_file(self.bucket_name, source_path, local_destination)
            return True
        except ClientError as e:
            print(f"Error downloading {source_path}: {e}")
            return False

    def delete_file(self, file_path: str) -> bool:
        if file_path.startswith("s3://"):
            file_path = "/".join(file_path.split("/")[3:])
            
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=file_path)
            return True
        except ClientError as e:
            return False

    def get_signed_url(self, file_path: str, expiration_minutes: int = 15) -> str:
        if file_path.startswith("s3://"):
            file_path = "/".join(file_path.split("/")[3:])
            
        try:
            response = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': file_path},
                ExpiresIn=expiration_minutes * 60
            )
            return response
        except ClientError as e:
            return ""
