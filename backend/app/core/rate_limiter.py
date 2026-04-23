from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
import os

# Initialize Limiter
# In production, use Redis. For local, we fallback to memory string if Redis not available.
redis_url = os.getenv("REDIS_URL", "memory://")
if redis_url == "memory://":
    limiter = Limiter(key_func=get_remote_address)
else:
    limiter = Limiter(key_func=get_remote_address, storage_uri=redis_url)

def setup_rate_limiter(app):
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
