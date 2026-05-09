"""
LUMEN CV API Endpoints — REST interface for the Computer Vision engine.
Model browsing, inference, ensemble, fine-tuning, and model comparison.
"""
import os
import uuid
import shutil
import tempfile
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()


# ─────────────────────────────────────────────────────────────
#  Model Zoo — Browse & Recommend
# ─────────────────────────────────────────────────────────────

@router.get("/models", summary="List all pre-trained CV models")
async def list_models(
    task_type: Optional[str] = Query(None, description="Filter: classification, detection, segmentation"),
    max_size_mb: Optional[float] = Query(None, description="Maximum model size in MB"),
    sort_by: str = Query("accuracy", description="Sort by: accuracy, speed, size, name"),
):
    from app.services.cv.model_registry import get_models
    models = get_models(task_type=task_type, max_size_mb=max_size_mb, sort_by=sort_by)
    return {"models": models, "total": len(models)}


@router.get("/models/{slug}", summary="Get details for a specific model")
async def get_model(slug: str):
    from app.services.cv.model_registry import get_model_by_slug
    model = get_model_by_slug(slug)
    if not model:
        raise HTTPException(status_code=404, detail=f"Model '{slug}' not found")
    return model


@router.post("/models/recommend", summary="AI-powered model recommendation")
async def recommend_models(
    num_images: int = Form(100),
    num_classes: int = Form(10),
    needs_speed: bool = Form(False),
    task_type: str = Form("classification"),
):
    from app.services.cv.model_registry import recommend_model
    recommendations = recommend_model(
        num_images=num_images, num_classes=num_classes,
        needs_speed=needs_speed, task_type=task_type,
    )
    return {"recommendations": recommendations}


# ─────────────────────────────────────────────────────────────
#  Inference — Single & Batch
# ─────────────────────────────────────────────────────────────

@router.post("/inference", summary="Run inference on a single image")
async def run_inference(
    image: UploadFile = File(...),
    model_slug: str = Form("resnet50"),
    current_user: User = Depends(get_current_user),
):
    from app.services.cv.model_loader import ModelLoader
    from PIL import Image
    import io

    contents = await image.read()
    pil_image = Image.open(io.BytesIO(contents)).convert("RGB")

    try:
        loader = ModelLoader()
        loaded = loader.load_model(model_slug)
        result = loaded.predict(pil_image)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")


@router.post("/batch-inference", summary="Run inference on multiple images")
async def run_batch_inference(
    images: List[UploadFile] = File(...),
    model_slug: str = Form("resnet50"),
    current_user: User = Depends(get_current_user),
):
    from app.services.cv.model_loader import ModelLoader
    from PIL import Image
    import io

    loader = ModelLoader()
    loaded = loader.load_model(model_slug)

    results = []
    for img_file in images:
        contents = await img_file.read()
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
        result = loaded.predict(pil_image)
        result["filename"] = img_file.filename
        results.append(result)

    return {"status": "success", "results": results, "total": len(results)}


# ─────────────────────────────────────────────────────────────
#  Ensemble — Multi-model merging
# ─────────────────────────────────────────────────────────────

@router.post("/ensemble", summary="Run ensemble inference with multiple models")
async def run_ensemble_inference(
    image: UploadFile = File(...),
    model_slugs: str = Form(..., description="Comma-separated model slugs"),
    strategy: str = Form("majority_vote"),
    current_user: User = Depends(get_current_user),
):
    from app.services.cv.model_loader import ModelLoader
    from app.services.cv.ensemble import run_ensemble
    from PIL import Image
    import io
    import numpy as np

    slugs = [s.strip() for s in model_slugs.split(",") if s.strip()]
    if len(slugs) < 2:
        raise HTTPException(status_code=400, detail="At least 2 models required for ensemble")
    if len(slugs) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 models for ensemble")

    contents = await image.read()
    pil_image = Image.open(io.BytesIO(contents)).convert("RGB")

    loader = ModelLoader()
    model_results = []
    prob_dists = []
    task_type = None

    for slug in slugs:
        try:
            loaded = loader.load_model(slug)
            if task_type is None:
                task_type = loaded.entry.task_type
            result = loaded.predict(pil_image)
            model_results.append(result)

            # Collect probability distributions for soft voting
            if task_type == "classification" and strategy == "soft_vote":
                try:
                    probs = loaded.predict_proba(pil_image)
                    prob_dists.append(probs)
                except Exception:
                    pass
        except Exception as e:
            model_results.append({"model": slug, "error": str(e)})

    ensemble_result = run_ensemble(
        model_results=model_results,
        strategy=strategy,
        task_type=task_type or "classification",
        prob_distributions=prob_dists if prob_dists else None,
    )

    return {"status": "success", **ensemble_result}


# ─────────────────────────────────────────────────────────────
#  Compare — Side-by-side model comparison
# ─────────────────────────────────────────────────────────────

@router.post("/compare", summary="Compare multiple models on the same image")
async def compare_models(
    image: UploadFile = File(...),
    model_slugs: str = Form(..., description="Comma-separated model slugs"),
    current_user: User = Depends(get_current_user),
):
    from app.services.cv.model_loader import ModelLoader
    from PIL import Image
    import io

    slugs = [s.strip() for s in model_slugs.split(",") if s.strip()]
    contents = await image.read()
    pil_image = Image.open(io.BytesIO(contents)).convert("RGB")

    loader = ModelLoader()
    results = []
    for slug in slugs:
        try:
            loaded = loader.load_model(slug)
            result = loaded.predict(pil_image)
            result["model_info"] = loaded.model_info
            results.append(result)
        except Exception as e:
            results.append({"model": slug, "error": str(e)})

    return {"status": "success", "comparisons": results, "total": len(results)}


# ─────────────────────────────────────────────────────────────
#  Fine-Tuning — Transfer learning jobs
# ─────────────────────────────────────────────────────────────

@router.post("/fine-tune", summary="Start a fine-tuning job")
async def start_fine_tune(
    dataset: UploadFile = File(..., description="Zip file with labeled images"),
    base_model: str = Form("resnet50"),
    mode: str = Form("lightweight", description="lightweight | full | lora"),
    epochs: int = Form(10),
    learning_rate: float = Form(0.001),
    batch_size: int = Form(32),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.cv_models import CVFineTuneJob
    from app.services.cv.model_registry import get_model_by_slug

    # Validate model exists
    model_info = get_model_by_slug(base_model)
    if not model_info:
        raise HTTPException(status_code=404, detail=f"Base model '{base_model}' not found")

    # Save uploaded dataset
    job_id = uuid.uuid4()
    upload_dir = os.path.join("uploads", "cv_datasets", str(current_user.id))
    os.makedirs(upload_dir, exist_ok=True)
    zip_path = os.path.join(upload_dir, f"{str(job_id)}.zip")

    with open(zip_path, "wb") as f:
        contents = await dataset.read()
        f.write(contents)

    # Create job record
    job = CVFineTuneJob(
        id=job_id,
        user_id=current_user.id,
        base_model_slug=base_model,
        job_type="fine_tune",
        status="pending",
        progress=0.0,
        config={
            "dataset_path": zip_path,
            "mode": mode,
            "epochs": epochs,
            "learning_rate": learning_rate,
            "batch_size": batch_size,
            "input_size": model_info.get("input_size", 224),
        },
    )
    db.add(job)
    await db.commit()

    # Trigger Celery task
    from app.services.cv.cv_tasks import run_fine_tune_job
    run_fine_tune_job.delay(str(job_id))

    return {"status": "started", "job_id": str(job_id), "base_model": base_model, "mode": mode}


@router.get("/fine-tune/{job_id}/status", summary="Get fine-tuning job progress")
async def get_fine_tune_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.cv_models import CVFineTuneJob
    result = await db.execute(
        select(CVFineTuneJob).filter(CVFineTuneJob.id == uuid.UUID(job_id))
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "job_id": str(job.id),
        "status": job.status,
        "progress": job.progress,
        "base_model": job.base_model_slug,
        "config": job.config,
        "results": job.results,
        "error": job.error_message,
        "created_at": str(job.created_at) if job.created_at else None,
        "completed_at": str(job.completed_at) if job.completed_at else None,
    }


@router.get("/fine-tune/{job_id}/download", summary="Download fine-tuned model weights")
async def download_fine_tuned_model(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.cv_models import CVFineTuneJob
    result = await db.execute(
        select(CVFineTuneJob).filter(CVFineTuneJob.id == uuid.UUID(job_id))
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Job is not completed yet")

    model_id_str = (job.results or {}).get("model_id")
    if not model_id_str:
        raise HTTPException(status_code=404, detail="No model artifact found")

    from app.models.cv_models import CVFineTunedModel
    result = await db.execute(
        select(CVFineTunedModel).filter(CVFineTunedModel.id == uuid.UUID(model_id_str))
    )
    ft_model = result.scalar_one_or_none()
    if not ft_model or not ft_model.storage_path or not os.path.exists(ft_model.storage_path):
        raise HTTPException(status_code=404, detail="Model file not found on disk")

    return FileResponse(
        ft_model.storage_path,
        media_type="application/octet-stream",
        filename=f"lumen_finetuned_{job_id}.pth",
    )
