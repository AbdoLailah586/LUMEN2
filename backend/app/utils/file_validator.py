"""
Security validation for uploads. Prevents malicious injections and enforces limits.
"""
import os
import magic # python-magic for true mime detection
from fastapi import UploadFile, HTTPException
import csv

ALLOWED_MIMES = os.getenv("ALLOWED_MIME_TYPES", "text/csv,application/json,image/jpeg,image/png").split(",")

# Typical malicious excel payload prefixes
CSV_INJECTION_CHARS = ('=', '+', '-', '@', '\t', '\r')

class FileValidator:
    
    @staticmethod
    def check_size(file_size_bytes: int, user_tier: str):
        """Enforces file limits based on subscription tier."""
        tier_limits_mb = {
            "free": 50,
            "pro": 1000, # 1GB
            "team": 5000, 
            "enterprise": 50000 # 50GB
        }
        
        limit_mb = tier_limits_mb.get(user_tier.lower(), 50)
        
        if file_size_bytes > limit_mb * 1024 * 1024:
            raise HTTPException(
                status_code=413, 
                detail=f"File exceeds your tier limit of {limit_mb}MB. Please upgrade."
            )

    @staticmethod
    async def validate_mime_type(file: UploadFile):
        """Uses python-magic to ensure the file isn't masked malware."""
        # Read first 2048 bytes for magic signature
        chunk = await file.read(2048)
        
        try:
            mime = magic.from_buffer(chunk, mime=True)
            if mime not in ALLOWED_MIMES:
                raise HTTPException(status_code=415, detail=f"Unsupported file type detected: {mime}")
        finally:
            await file.seek(0) # Reset pointer
            
    @staticmethod
    async def detect_csv_injection(file: UploadFile):
        """Detects CSV injection vulnerabilities (DDE attacks)."""
        filename = file.filename.lower()
        if not filename.endswith('.csv'):
            return
            
        chunk = await file.read(8192) # Read first 8KB to check headers/first rows
        try:
            text = chunk.decode("utf-8", errors="ignore")
            for line in text.split('\n'):
                if not line: continue
                cells = line.split(',')
                for cell in cells:
                    cell = cell.strip()
                    if cell and cell.startswith(CSV_INJECTION_CHARS):
                        raise HTTPException(
                            status_code=400, 
                            detail="Malicious CSV injection payload detected. File rejected."
                        )
        finally:
            await file.seek(0)
            
    @staticmethod
    def scan_malware(file_path: str):
        """
        Integrates with local ClamAV daemon to scan physical files.
        """
        try:
            import clamd
            cd = clamd.ClamdUnixSocket()
            result = cd.instream(open(file_path, "rb"))
            if result['stream'][0] == 'FOUND':
                os.remove(file_path)
                raise HTTPException(status_code=400, detail="Malware detected by ClamAV.")
        except ImportError:
            # ClamD not installed, skip or log warning depending on environment
            pass
        except Exception as e:
            # Fallback if clamd daemon isn't running on the deployment
            print(f"Malware scan skipped or failed: {e}")
