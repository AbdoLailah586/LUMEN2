from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Any

from app.schemas.job import Job, JobCreate
from app.models.job import Job as JobModel
from app.core.database import get_db

router = APIRouter()

@router.post("/", response_model=Job)
async def create_job(
    *,
    db: AsyncSession = Depends(get_db),
    job_in: JobCreate,
) -> Any:
    """
    Create new job.
    """
    db_job = JobModel(**job_in.model_dump())
    db.add(db_job)
    await db.commit()
    await db.refresh(db_job)
    return db_job

@router.get("/", response_model=List[Job])
async def read_jobs(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve jobs.
    """
    result = await db.execute(select(JobModel).offset(skip).limit(limit))
    jobs = result.scalars().all()
    return jobs
