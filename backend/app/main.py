from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.rate_limiter import setup_rate_limiter

app = FastAPI(title=settings.PROJECT_NAME)

# CORS configuration
# Local dev origins are always included.
# Production URLs are injected via the FRONTEND_URL env var (comma-separated).
_local_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3000",
]

_extra_origins = [
    url.strip()
    for url in settings.FRONTEND_URL.split(",")
    if url.strip()
]

origins = _local_origins + _extra_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

setup_rate_limiter(app)

@app.get("/health")
async def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME}

from app.api.api import api_router

app.include_router(api_router, prefix=settings.API_V1_STR)
