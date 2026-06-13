from datetime import datetime, timezone
import json
import os
import uuid

import joblib
import mlflow
import pandas as pd
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.dataset import Dataset
from app.models.job import Job
from app.models.model import Model
from app.services.cleaning.generic import GenericFeatureEngineer
from app.services.cleaning.inference import ColumnTypeInference
from app.services.ml.distributed import DataProcessorFactory
from app.services.ml.evaluator import ModelEvaluator
from app.services.ml.explainer import ModelExplainer
from app.services.ml.generic_trainer import GenericTrainer
from app.services.ml.metric_feedback import build_metric_feedback, build_overall_recommendation
from app.services.ml.task_type_detector import detect_task_type
from app.services.ml.training_logger import append_training_log
from app.services.ml.training_optimizer import (
    TUNABLE_MODELS,
    build_ensemble,
    score_model_cv,
    tune_hyperparameters,
)
from app.services.storage import get_storage_service


def _set_progress(db, job, progress: float) -> None:
    job.progress = round(min(max(progress, 0.0), 100.0), 1)
    db.commit()


def _log_code(db, job, message: str, code: str, step: str = None) -> None:
    append_training_log(db, job, message, log_type="code", code=code, step=step)


@celery_app.task(bind=True)
def run_training_job(self, job_id: str):
    db = SessionLocal()
    job = db.query(Job).filter(Job.id == uuid.UUID(job_id)).first()
    if not job:
        db.close()
        return "Job not found"

    try:
        job.status = "running"
        job.results = {"training_log": []}
        _set_progress(db, job, 2.0)

        append_training_log(
            db, job,
            "Initializing training pipeline...",
            log_type="system",
            step="init",
        )
        _log_code(
            db, job,
            "Loading dependencies",
            "from sklearn.model_selection import train_test_split\n"
            "from app.services.ml.generic_trainer import GenericTrainer",
            step="init",
        )

        dataset = db.query(Dataset).filter(Dataset.id == job.dataset_id).first()
        storage_uri = dataset.storage_path
        storage_svc = get_storage_service()
        temp_dataset_path = f"/tmp/{dataset.filename}" if os.name != "nt" else f"temp_{dataset.filename}"
        storage_svc.download_file(storage_uri, temp_dataset_path)

        _set_progress(db, job, 8.0)
        _log_code(
            db, job,
            f"Loading dataset: {dataset.original_filename}",
            f"import pandas as pd\n"
            f"df = pd.read_{dataset.file_type}('{dataset.original_filename}')\n"
            f"print(df.shape)  # rows, columns",
            step="load",
        )

        df = DataProcessorFactory.load_data(temp_dataset_path, dataset.file_type, dataset.file_size)
        import dask.dataframe as dd
        if isinstance(df, dd.DataFrame):
            df = df.compute()

        config = job.config
        target_col = config.get("target_column")
        configured_task_type = config.get("task_type", "classification")
        params = config.get("parameters", {})
        cv_folds = int(params.get("cv_folds", 5))
        selected_models = config.get("models", ["XGBoost", "RandomForest"])
        enable_tuning = config.get("enable_hyperparameter_tuning", True)
        enable_ensemble = config.get("enable_ensemble", True)
        tuning_timeout = int(params.get("tuning_timeout_seconds", 60))

        if not target_col or target_col not in df.columns:
            raise ValueError(f"Target column '{target_col}' not found in dataset")

        append_training_log(
            db, job,
            f"Dataset loaded: {len(df)} rows x {len(df.columns)} columns. Target: '{target_col}'",
            log_type="info",
            step="load",
        )
        _set_progress(db, job, 15.0)

        df = df.dropna(subset=[target_col])

        y_preview = df[target_col]
        if config.get("auto_detect_task_type", True):
            task_type, task_reason = detect_task_type(y_preview, configured_task_type)
        else:
            task_type = configured_task_type
            task_reason = "user-configured task type"

        append_training_log(
            db, job,
            f"Task type: {task_type} ({task_reason})"
            + (f" [was configured as {configured_task_type}]" if task_type != configured_task_type else ""),
            log_type="info",
            step="load",
        )

        _log_code(
            db, job,
            "Feature engineering pipeline",
            f"target_col = '{target_col}'\n"
            f"df = df.dropna(subset=[target_col])\n"
            f"engineer = GenericFeatureEngineer(inferred_types)\n"
            f"df = engineer.apply_transformations(df)",
            step="features",
        )

        inferencer = ColumnTypeInference(df, target_col=target_col)
        inferred_types = inferencer.infer_types()
        engineer = GenericFeatureEngineer(inferred_types)
        df = engineer.apply_transformations(df)

        _set_progress(db, job, 22.0)
        append_training_log(db, job, "Feature engineering complete.", step="features")

        if task_type == "classification":
            le = LabelEncoder()
            if df[target_col].dtype in ["float64", "float32"]:
                df[target_col] = df[target_col].astype(str)
            df[target_col] = le.fit_transform(df[target_col])
            _log_code(
                db, job,
                "Encoding target labels",
                f"from sklearn.preprocessing import LabelEncoder\n"
                f"le = LabelEncoder()\n"
                f"y = le.fit_transform(df['{target_col}'])",
                step="encode",
            )

        X = df.drop(columns=[target_col], errors="ignore")
        y = df[target_col]
        if target_col not in df.columns:
            raise ValueError("Target column lost during transformation.")

        _set_progress(db, job, 28.0)
        stratify = None
        if task_type == "classification" and hasattr(y, "nunique") and y.nunique() > 1:
            stratify = y
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=stratify,
        )

        _log_code(
            db, job,
            "Train/test split",
            f"X_train, X_test, y_train, y_test = train_test_split(\n"
            f"    X, y, test_size=0.2, random_state=42\n"
            f")\n"
            f"# Train: {len(X_train)} rows | Test: {len(X_test)} rows",
            step="split",
        )
        append_training_log(
            db, job,
            f"Split complete — train: {len(X_train)}, test: {len(X_test)}, features: {X.shape[1]}",
            step="split",
        )

        trainer = GenericTrainer(
            target_column=target_col,
            is_classification=(task_type == "classification"),
            cv_folds=cv_folds,
            hyperparameters=params,
        )
        normalized_models = GenericTrainer.normalize_model_names(selected_models)
        _set_progress(db, job, 32.0)

        append_training_log(
            db, job,
            f"Training {len(normalized_models)} model(s): {', '.join(normalized_models)}",
            log_type="info",
            step="train",
        )

        progress_per_model = 45.0 / max(len(normalized_models), 1)
        completed_count = [0]

        def on_model_done(name, result):
            completed_count[0] += 1
            progress = 32.0 + completed_count[0] * progress_per_model
            _set_progress(db, job, progress)

            if "error" in result:
                append_training_log(db, job, f"FAILED {name}: {result['error']}", log_type="error")
                return

            hp = params
            _log_code(
                db, job,
                f"Trained {name}",
                f"from sklearn... import ...\n"
                f"model = {name}(\n"
                f"    n_estimators={hp.get('n_estimators', 100)},\n"
                f"    max_depth={hp.get('max_depth', 6)},\n"
                f"    learning_rate={hp.get('learning_rate', 0.1)}\n"
                f")\n"
                f"scores = cross_val_score(model, X_train, y_train, cv={cv_folds})\n"
                f"model.fit(X_train, y_train)\n"
                f"# CV {result['metric_used']}: {result['cv_mean_score']:.4f} (+/- {result['cv_std_score']:.4f})",
                step="train",
            )
            append_training_log(
                db, job,
                f"{name} — CV {result['metric_used']}: {result['cv_mean_score']:.4f} "
                f"(+/- {result['cv_std_score']:.4f}) in {result['training_time_seconds']}s",
                log_type="success",
            )

        training_results = trainer.train(
            X_train, y_train,
            selected_models=normalized_models,
            on_model_complete=on_model_done,
        )

        best_name = trainer.pick_best_model(training_results)
        best_result = training_results[best_name]
        model = best_result["fitted_model"]
        tuned_params = None
        optimization_steps: list[str] = []
        ensemble_models: list[str] = []
        tuned_model_name = best_name
        comparison_best_name = best_name
        final_cv = best_result["cv_mean_score"]

        append_training_log(
            db, job,
            f"Best model selected: {best_name} (CV {best_result['metric_used']}: {best_result['cv_mean_score']:.4f})",
            log_type="success",
            step="optimize",
        )
        _set_progress(db, job, 72.0)

        if enable_tuning and tuned_model_name in TUNABLE_MODELS:
            append_training_log(db, job, f"Optuna hyperparameter tuning for {tuned_model_name}...", step="optimize")
            _log_code(
                db, job,
                f"Hyperparameter optimization ({tuning_timeout}s budget)",
                f"import optuna\n"
                f"study = optuna.create_study(direction='maximize')\n"
                f"study.optimize(objective, timeout={tuning_timeout})\n"
                f"# Tuning {tuned_model_name} — n_estimators, max_depth, learning_rate",
                step="optimize",
            )
            try:
                tuned_model, tuned_params, tuned_cv = tune_hyperparameters(
                    tuned_model_name, X_train, y_train, task_type, params,
                    cv_folds=cv_folds, timeout_seconds=tuning_timeout,
                )
                if tuned_cv > final_cv:
                    model = tuned_model
                    final_cv = tuned_cv
                    training_results[tuned_model_name]["fitted_model"] = tuned_model
                    training_results[tuned_model_name]["cv_mean_score"] = tuned_cv
                    optimization_steps.append(f"Optuna tuning on {tuned_model_name}")
                    append_training_log(
                        db, job,
                        f"Tuning complete — CV score improved to {tuned_cv:.4f}. Params: {tuned_params}",
                        log_type="success",
                        step="optimize",
                    )
                else:
                    append_training_log(
                        db, job,
                        f"Tuning finished (CV {tuned_cv:.4f}) — kept baseline {best_name} (CV {final_cv:.4f})",
                        log_type="info",
                        step="optimize",
                    )
            except Exception as exc:
                append_training_log(db, job, f"Tuning skipped: {exc}", log_type="info", step="optimize")

        _set_progress(db, job, 78.0)

        if enable_ensemble and len([r for r in training_results.values() if "fitted_model" in r]) >= 2:
            try:
                ensemble, ensemble_models = build_ensemble(training_results, task_type, top_k=3)
                ensemble.fit(X_train, y_train)
                ensemble_cv = score_model_cv(ensemble, X_train, y_train, task_type, cv_folds)
                if ensemble_cv > final_cv:
                    model = ensemble
                    best_name = f"Ensemble({'+'.join(ensemble_models)})"
                    final_cv = ensemble_cv
                    optimization_steps.append(f"Voting ensemble: {', '.join(ensemble_models)}")
                    append_training_log(
                        db, job,
                        f"Ensemble selected (CV {ensemble_cv:.4f}) from: {', '.join(ensemble_models)}",
                        log_type="success",
                        step="optimize",
                    )
                else:
                    append_training_log(
                        db, job,
                        f"Ensemble CV {ensemble_cv:.4f} did not beat current best ({final_cv:.4f}) — skipped",
                        log_type="info",
                        step="optimize",
                    )
            except Exception as exc:
                append_training_log(db, job, f"Ensemble skipped: {exc}", log_type="info", step="optimize")

        _set_progress(db, job, 80.0)

        _log_code(
            db, job,
            "Evaluating on held-out test set",
            f"predictions = model.predict(X_test)\n"
            f"metrics = evaluator.evaluate(model, X_test, y_test, task_type='{task_type}')",
            step="evaluate",
        )

        evaluator = ModelEvaluator()
        metrics = evaluator.evaluate(model, X_test, y_test, task_type)
        if task_type == "classification" and metrics.get("f1") is not None:
            metrics["f1_score"] = metrics["f1"]

        class_distribution = None
        if task_type == "classification":
            from collections import Counter
            test_counts = Counter(y_test)
            metrics["baseline_accuracy"] = float(max(test_counts.values()) / len(y_test))
            class_distribution = {str(k): int(v) for k, v in sorted(Counter(y).items())}
            append_training_log(
                db, job,
                f"Majority-class baseline accuracy: {metrics['baseline_accuracy']:.4f} "
                f"(classes: {class_distribution})",
                log_type="info",
                step="evaluate",
            )

        confusion_matrix_data = None
        if task_type == "classification":
            from sklearn.metrics import confusion_matrix
            preds = model.predict(X_test)
            confusion_matrix_data = confusion_matrix(y_test, preds).tolist()
            try:
                scores = cross_val_score(model, X, y, cv=cv_folds, scoring="f1_weighted")
                metrics["cv_f1_mean"] = float(scores.mean())
                metrics["cv_f1_std"] = float(scores.std())
            except Exception:
                pass

        _set_progress(db, job, 88.0)
        append_training_log(
            db, job,
            f"Test metrics: {json.dumps({k: round(v, 4) if isinstance(v, float) else v for k, v in metrics.items()})}",
            log_type="info",
            step="evaluate",
        )

        explainer = ModelExplainer()
        feature_importance = explainer.explain(model, X_test, feature_names=X.columns.tolist())
        _set_progress(db, job, 92.0)

        _log_code(
            db, job,
            "Computing SHAP feature importance",
            "explainer = ModelExplainer()\n"
            "importance = explainer.explain(model, X_test, feature_names=X.columns)",
            step="explain",
        )

        model_comparison = []
        for name, res in training_results.items():
            entry = {"model_name": name}
            if "error" in res:
                entry["error"] = res["error"]
                entry["status"] = "failed"
            else:
                entry.update({
                    "cv_mean_score": res["cv_mean_score"],
                    "cv_std_score": res["cv_std_score"],
                    "metric_used": res["metric_used"],
                    "training_time_seconds": res["training_time_seconds"],
                    "status": "success",
                    "is_best": name == comparison_best_name,
                })
            model_comparison.append(entry)

        model_comparison.sort(
            key=lambda m: m.get("cv_mean_score", float("-inf")),
            reverse=True,
        )

        metric_feedback = build_metric_feedback(metrics, task_type)
        overall_recommendation = build_overall_recommendation(
            metrics, task_type, model_comparison, best_name
        )

        from app.core.mlflow_config import configure_mlflow

        configure_mlflow()
        mlflow.set_experiment(f"Experiment_{dataset.original_filename}")
        with mlflow.start_run(run_name=f"{task_type}_{best_name}_{job_id}") as run:
            mlflow.log_params(params)
            mlflow.log_param("best_model", best_name)
            mlflow.log_param("task_type", task_type)
            mlflow.log_param("configured_task_type", configured_task_type)
            if tuned_params:
                mlflow.log_params({f"tuned_{k}": v for k, v in tuned_params.items()})
            mlflow_metrics = {
                k: float(v) for k, v in metrics.items()
                if v is not None and isinstance(v, (int, float))
            }
            if mlflow_metrics:
                mlflow.log_metrics(mlflow_metrics)
            mlflow_run_id = run.info.run_id

        model_id = uuid.uuid4()
        model_filename = f"{str(model_id)}.joblib"
        temp_model_path = f"/tmp/{model_filename}" if os.name != "nt" else f"temp_{model_filename}"
        joblib.dump(model, temp_model_path)

        with open(temp_model_path, "rb") as f:
            model_storage_uri = storage_svc.upload_file(f, f"models/{model_filename}")

        try:
            os.remove(temp_model_path)
            os.remove(temp_dataset_path)
        except Exception:
            pass

        db_model = Model(
            id=model_id,
            job_id=job.id,
            dataset_id=dataset.id,
            model_name=f"{best_name}_{task_type}",
            model_type=best_name,
            parameters=params,
            metrics=metrics,
            storage_path=model_storage_uri,
            mlflow_run_id=mlflow_run_id,
        )
        db.add(db_model)

        existing_log = (job.results or {}).get("training_log", [])
        job.results = {
            "model_id": str(model_id),
            "metrics": metrics,
            "feature_importance": feature_importance,
            "confusion_matrix": confusion_matrix_data,
            "training_log": existing_log,
            "model_comparison": model_comparison,
            "best_model": best_name,
            "metric_feedback": metric_feedback,
            "overall_recommendation": overall_recommendation,
            "training_summary": {
                "rows_train": len(X_train),
                "rows_test": len(X_test),
                "features": X.shape[1],
                "models_trained": len(normalized_models),
                "cv_folds": cv_folds,
                "task_type": task_type,
                "configured_task_type": configured_task_type,
                "task_type_reason": task_reason,
                "target_column": target_col,
                "hyperparameter_tuning": enable_tuning and tuned_model_name in TUNABLE_MODELS,
                "tuned_hyperparameters": tuned_params,
                "ensemble_models": ensemble_models,
                "optimization_steps": optimization_steps,
                "final_model": best_name,
                "final_cv_score": final_cv,
                "class_distribution": class_distribution,
                "baseline_accuracy": metrics.get("baseline_accuracy"),
            },
        }
        job.status = "completed"
        job.progress = 100.0
        job.completed_at = datetime.now(timezone.utc)

        append_training_log(
            db, job,
            f"Training complete! Best model: {best_name}. Model saved.",
            log_type="success",
            step="done",
        )
        db.commit()

    except Exception as e:
        import traceback
        job.status = "failed"
        job.error_message = f"{str(e)}\n\n{traceback.format_exc()}"
        append_training_log(db, job, f"Training failed: {str(e)}", log_type="error", step="failed")
        db.commit()
    finally:
        db.close()
