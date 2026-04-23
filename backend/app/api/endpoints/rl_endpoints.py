from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from celery.result import AsyncResult
from app.core.celery_app import celery_app
from app.services.rl.tasks import train_rl_agent

router = APIRouter(prefix="/api/rl", tags=["RL Agent"])

class RLTrainRequest(BaseModel):
    data_path: str
    target_column: str
    total_timesteps: int = 1000

@router.post("/train")
async def start_rl_training(request: RLTrainRequest):
    """
    Start an RL Agent training job.
    """
    task = train_rl_agent.delay(
        data_path=request.data_path,
        target_column=request.target_column,
        total_timesteps=request.total_timesteps
    )
    return {"job_id": task.id, "status": "Training started"}

@router.get("/status/{job_id}")
async def get_rl_training_status(job_id: str):
    """
    Get the status of an RL training job.
    """
    task_result = AsyncResult(job_id, app=celery_app)
    
    if task_result.state == "PENDING":
        return {"job_id": job_id, "status": "Pending"}
    elif task_result.state == "PROGRESS":
        return {"job_id": job_id, "status": task_result.info.get("status", "In Progress")}
    elif task_result.state == "SUCCESS":
        return {
            "job_id": job_id,
            "status": "Completed",
            "result": task_result.result
        }
    elif task_result.state == "FAILURE":
        return {
            "job_id": job_id,
            "status": "Failed",
            "error": str(task_result.info)
        }
    else:
        return {"job_id": job_id, "status": task_result.state}
