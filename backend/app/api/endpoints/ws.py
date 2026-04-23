from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.job import Job
from app.core.database import get_db

router = APIRouter()

@router.websocket("/jobs/{job_id}")
async def websocket_job_status(websocket: WebSocket, job_id: str, db: AsyncSession = Depends(get_db)):
    await websocket.accept()
    try:
        while True:
            # Poll database for current job status
            result = await db.execute(select(Job).filter(Job.id == job_id))
            job = result.scalar_one_or_none()
            
            if job:
                await db.refresh(job)
                await websocket.send_json({
                    "status": job.status,
                    "progress": job.progress,
                })
                # If finished, we can close the connection
                if job.status in ["completed", "failed"]:
                    break
            else:
                await websocket.send_json({"error": "job not found"})
                break
                
            await asyncio.sleep(1) # Send update every 1 second
            
    except WebSocketDisconnect:
        print(f"Client disconnected from job {job_id} status stream")
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
