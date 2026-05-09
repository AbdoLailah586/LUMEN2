"""
LUMEN CV Celery Tasks — Async wrappers for fine-tuning, distillation, and batch inference.
These tasks update the database Job table with progress and results.
"""
import os
import uuid
import traceback
from datetime import datetime

from app.core.celery_app import celery_app
from app.core.database import SessionLocal


def _get_device() -> str:
    """Detect best available device."""
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
    except ImportError:
        pass
    return "cpu"


@celery_app.task(name="app.services.cv.fine_tune", bind=True, max_retries=0)
def run_fine_tune_job(self, job_id: str):
    """
    Celery task: run a CV fine-tuning job.
    Reads config from the cv_fine_tune_jobs table, runs training, saves model.
    """
    from app.models.cv_models import CVFineTuneJob, CVFineTunedModel
    from app.services.cv.fine_tuner import prepare_dataset, build_finetune_model, train_loop, save_finetuned_model

    db = SessionLocal()
    try:
        job = db.query(CVFineTuneJob).filter(CVFineTuneJob.id == uuid.UUID(job_id)).first()
        if not job:
            return {"error": f"Job {job_id} not found"}

        job.status = "running"
        job.progress = 0.0
        db.commit()

        config = job.config or {}
        device = _get_device()

        # Prepare dataset
        zip_path = config.get("dataset_path", "")
        target_size = config.get("input_size", 224)
        batch_size = config.get("batch_size", 32)

        train_loader, val_loader, class_names, num_classes = prepare_dataset(
            zip_path, target_size=target_size, batch_size=batch_size
        )

        # Build model
        model = build_finetune_model(
            base_slug=job.base_model_slug,
            num_classes=num_classes,
            mode=config.get("mode", "lightweight"),
            device=device,
        )

        # Progress callback
        def on_progress(progress: float, metrics: dict):
            job.progress = round(progress * 100, 1)
            job.results = {**(job.results or {}), "current_metrics": metrics}
            db.commit()

        # Train
        results = train_loop(
            model=model,
            train_loader=train_loader,
            val_loader=val_loader,
            epochs=config.get("epochs", 10),
            lr=config.get("learning_rate", 1e-3),
            device=device,
            progress_callback=on_progress,
            patience=config.get("patience", 5),
        )

        # Save model
        save_dir = os.path.join("uploads", "cv_models", str(job.user_id), str(job_id))
        weights_path = save_finetuned_model(model, save_dir, {
            "base_model": job.base_model_slug,
            "num_classes": num_classes,
            "class_names": class_names,
            "results": results,
        })

        # Create fine-tuned model record
        ft_model = CVFineTunedModel(
            id=uuid.uuid4(),
            user_id=job.user_id,
            base_model_slug=job.base_model_slug,
            num_classes=num_classes,
            class_names=class_names,
            num_epochs=results["total_epochs_run"],
            accuracy=results["best_val_accuracy"],
            storage_path=weights_path,
        )
        db.add(ft_model)

        # Update job
        job.status = "completed"
        job.progress = 100.0
        job.results = {**(job.results or {}), **results, "model_id": str(ft_model.id)}
        job.completed_at = datetime.utcnow()
        db.commit()

        return {"status": "completed", "model_id": str(ft_model.id), "accuracy": results["best_val_accuracy"]}

    except Exception as e:
        job = db.query(CVFineTuneJob).filter(CVFineTuneJob.id == uuid.UUID(job_id)).first()
        if job:
            job.status = "failed"
            job.error_message = str(e)
            job.results = {**(job.results or {}), "traceback": traceback.format_exc()}
            db.commit()
        return {"status": "failed", "error": str(e)}
    finally:
        db.close()


@celery_app.task(name="app.services.cv.distill", bind=True, max_retries=0)
def run_distillation_job(self, job_id: str):
    """Celery task: run knowledge distillation."""
    from app.models.cv_models import CVFineTuneJob
    from app.services.cv.fine_tuner import prepare_dataset
    from app.services.cv.distillation import distill

    db = SessionLocal()
    try:
        job = db.query(CVFineTuneJob).filter(CVFineTuneJob.id == uuid.UUID(job_id)).first()
        if not job:
            return {"error": f"Job {job_id} not found"}

        job.status = "running"
        db.commit()

        config = job.config or {}
        device = _get_device()

        train_loader, val_loader, class_names, num_classes = prepare_dataset(
            config.get("dataset_path", ""), target_size=config.get("input_size", 224)
        )

        def on_progress(progress: float, metrics: dict):
            job.progress = round(progress * 100, 1)
            db.commit()

        results = distill(
            teacher_slug=config.get("teacher_slug", "resnet152"),
            student_slug=config.get("student_slug", "mobilenetv3_small"),
            train_loader=train_loader,
            val_loader=val_loader,
            num_classes=num_classes,
            epochs=config.get("epochs", 20),
            temperature=config.get("temperature", 4.0),
            alpha=config.get("alpha", 0.7),
            device=device,
            progress_callback=on_progress,
        )

        job.status = "completed"
        job.progress = 100.0
        job.results = results
        job.completed_at = datetime.utcnow()
        db.commit()
        return results

    except Exception as e:
        job = db.query(CVFineTuneJob).filter(CVFineTuneJob.id == uuid.UUID(job_id)).first()
        if job:
            job.status = "failed"
            job.error_message = str(e)
            db.commit()
        return {"error": str(e)}
    finally:
        db.close()
