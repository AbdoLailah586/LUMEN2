from fastapi import APIRouter
from pydantic import BaseModel
from celery.result import AsyncResult
from app.core.celery_app import celery_app
from app.services.gnn.tasks import train_gnn_agent

router = APIRouter(prefix="/api/gnn", tags=["GNN Agent"])

class GNNTrainRequest(BaseModel):
    data_path: str
    target_column: str
    similarity_metric: str = "cosine"
    construction_method: str = "knn"
    k: int = 5
    threshold: float = 0.5
    epochs: int = 50
    batch_size: int = 16

@router.post("/train")
async def start_gnn_training(request: GNNTrainRequest):
    """
    Start a Graph Neural Network training job from a tabular dataset.
    """
    task = train_gnn_agent.delay(
        data_path=request.data_path,
        target_column=request.target_column,
        similarity_metric=request.similarity_metric,
        construction_method=request.construction_method,
        k=request.k,
        threshold=request.threshold,
        epochs=request.epochs,
        batch_size=request.batch_size
    )
    return {"job_id": task.id, "status": "GNN Training started"}

@router.get("/status/{job_id}")
async def get_gnn_training_status(job_id: str):
    """
    Get the status of a GNN training job.
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
