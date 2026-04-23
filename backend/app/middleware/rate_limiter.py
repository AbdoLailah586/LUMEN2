"""
Redis-backed rate limiting middleware for FastAPI.
Provides sliding window limits per IP and per Authorized User.
"""
from fastapi import Request, HTTPException
import aioredis
import os
import time

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/1")

# Different endpoints can have different strictness limits inside here
ENDPOINT_LIMITS = {
    "/api/controls/training/custom": {"calls": 5, "window_seconds": 3600}, # 5 trainings per hour
    "/api/controls/cleaning/custom": {"calls": 20, "window_seconds": 60},  # 20 ops per min
    "default": {"calls": 60, "window_seconds": 60}                         # 60 global requests per min
}

class RateLimiter:
    def __init__(self):
        self.redis = aioredis.from_url(REDIS_URL, decode_responses=True)
        
    async def _check_rate_limit(self, identifier: str, limit: int, window: int):
        """
        Sliding log mechanism using Redis Sorted Sets.
        """
        current_time = int(time.time())
        window_start = current_time - window
        
        pipeline = self.redis.pipeline()
        
        # Remove old requests
        pipeline.zremrangebyscore(identifier, 0, window_start)
        # Add current request
        pipeline.zadd(identifier, {str(current_time): current_time})
        # Count requests in window
        pipeline.zcard(identifier)
        # Set expiration on the set to clean up inactive users automatically
        pipeline.expire(identifier, window)
        
        results = await pipeline.execute()
        request_count = results[2]
        
        if request_count > limit:
            raise HTTPException(
                status_code=429, 
                detail="Rate limit exceeded. Please try again later."
            )

    async def __call__(self, request: Request):
        """Middleware hook for FastAPI dependencies."""
        path = request.url.path
        
        # Determine the applicable limit
        limit_config = ENDPOINT_LIMITS.get(path, ENDPOINT_LIMITS["default"])
        limit = limit_config["calls"]
        window = limit_config["window_seconds"]
        
        # Identify user
        # In a real impl, this would fetch from Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header:
            identifier = f"rate_limit:user:{auth_header}"
        else:
            client_ip = request.client.host
            identifier = f"rate_limit:ip:{client_ip}:{path}"
            
        await self._check_rate_limit(identifier, limit, window)
