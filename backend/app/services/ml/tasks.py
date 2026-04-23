from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.job import Job
from app.models.dataset import Dataset
from app.models.model import Model
from .trainer import MultiBackendTrainer
from .optimizer import HyperparameterOptimizer
from .evaluator import ModelEvaluator
from .explainer import ModelExplainer
from sklearn.model_selection import train_test_split
import pandas as pd
import json
import uuid
import os
import joblib
import mlflow
from app.services.cleaning.inference import ColumnTypeInference
from app.services.cleaning.generic import GenericFeatureEngineer
from app.services.storage import get_storage_service
from app.services.ml.distributed import DataProcessorFactory

@celery_app.task(bind=True)
def run_training_job(self, job_id: str):
    db = SessionLocal()
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        db.close()
        return "Job not found"
        
    try:
        job.status = "running"
        job.progress = 10.0
        db.commit()
        
        dataset = db.query(Dataset).filter(Dataset.id == job.dataset_id).first()
        storage_uri = dataset.storage_path
        
        storage_svc = get_storage_service()
        temp_dataset_path = f"/tmp/{dataset.filename}" if os.name != 'nt' else f"temp_{dataset.filename}"
        storage_svc.download_file(storage_uri, temp_dataset_path)
        file_path = temp_dataset_path
        
        # Load Data using Hybrid Processing Engine (Dask logic wrapper)
        df = DataProcessorFactory.load_data(file_path, dataset.file_type, dataset.file_size)
        
        # If df is a Dask DataFrame, we compute down to Pandas after initial loading for 
        # the small prototype tasks, or we can leave it as Dask for out-of-core pipeline:
        import dask.dataframe as dd
        is_dask = isinstance(df, dd.DataFrame)
        
        if is_dask:
            # We would normally apply Dask specific transformations here.
            # But for AutoML GenericPipeline, we invoke compute() post-filtering if needed, 
            # or keep it purely out-of-core. Converting to pd for the sake of simplicity if filtered. 
            df = df.compute()
        
        config = job.config
        target_col = config.get("target_column")
        task_type = config.get("task_type", "classification")
        preset = config.get("preset", "beginner")
        
        if not target_col or target_col not in df.columns:
            raise ValueError(f"Target column '{target_col}' not found in dataset")
            
        # Basic preprocessing: drop NaNs in target
        df = df.dropna(subset=[target_col])
        
        # --- GENERIC FEATURE ENGINEERING & INFERENCE ---
        job.progress = 20.0
        db.commit()
        
        inferencer = ColumnTypeInference(df, target_col=target_col)
        inferred_types = inferencer.infer_types()
        
        engineer = GenericFeatureEngineer(inferred_types)
        df = engineer.apply_transformations(df)
        df = engineer.detect_outliers(df, method='iqr')
        # --------------------------------------------------------------------------

        # Encode target for classification to ensure discrete classes (required by XGBoost)
        if task_type == 'classification':
            from sklearn.preprocessing import LabelEncoder
            le = LabelEncoder()
            # If target somehow became float (e.g., via rogue scaling during cleaning), treat as string to get discrete classes
            if df[target_col].dtype in ['float64', 'float32']:
                df[target_col] = df[target_col].astype(str)
            df[target_col] = le.fit_transform(df[target_col])
        
        X = df.drop(columns=[target_col], errors='ignore')
        if target_col in df.columns:
            y = df[target_col]
        else:
            raise ValueError("Target column lost during transformation.")
        
        job.progress = 30.0
        db.commit()
        
        # Determine hyperparams / models based on preset
        if preset == 'expert':
            # Run optimizer for XGBoost to be part of the ensemble or just directly run the ensemble trainer
            optimizer = HyperparameterOptimizer(time_budget_seconds=120)
            best_params = optimizer.optimize(X, y, task_type=task_type, backend='xgboost', model_type='xgboost')
            # Instead of single xgboost, we use our new ensemble that incorporates these models. 
            # Note: The tuning was for XGBoost, but ensemble's other models use defaults.
            trainer = MultiBackendTrainer(backend='ensemble', model_type='ensemble', params=best_params)
        elif preset == 'intermediate':
            # Run optimizer with less time budget
            optimizer = HyperparameterOptimizer(time_budget_seconds=30)
            best_params = optimizer.optimize(X, y, task_type=task_type, backend='scikit-learn', model_type='rf')
            trainer = MultiBackendTrainer(backend='scikit-learn', model_type='rf', params=best_params)
        else: # beginner
            # Default params
            trainer = MultiBackendTrainer(backend='scikit-learn', model_type='rf')
            best_params = {}
            
        job.progress = 50.0
        db.commit()
            
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        mlflow.set_tracking_uri("sqlite:///mlruns.db" if os.environ.get("DOCKER_ENV") else "file:./mlruns")
        mlflow.set_experiment(f"Experiment_{dataset.original_filename}")
        
        with mlflow.start_run(run_name=f"{task_type}_{preset}_{job_id}"):
            mlflow.log_params(best_params)
            mlflow.log_param("task_type", task_type)
            mlflow.log_param("preset", preset)
            
            model = trainer.train(X_train, y_train, task_type=task_type)
            
            job.progress = 70.0
            db.commit()
            
            # Evaluate
            evaluator = ModelEvaluator()
            metrics = evaluator.evaluate(model, X_test, y_test, task_type)
            
            # Cross-validation score check
            from sklearn.model_selection import cross_val_score
            if task_type == 'classification':
                try:
                    scores = cross_val_score(model, X, y, cv=5, scoring='f1_weighted')
                    metrics['cv_f1_mean'] = float(scores.mean())
                    metrics['cv_f1_std'] = float(scores.std())
                except Exception as e:
                    pass
            
            mlflow.log_metrics(metrics)
            
            job.progress = 85.0
            db.commit()
        
        # Explain
        explainer = ModelExplainer()
        feature_importance = explainer.explain(model, X_test, feature_names=X.columns.tolist())
        
        # Save model to cloud storage
        model_id = str(uuid.uuid4())
        model_filename = f"{model_id}.joblib"
        
        # Save temp local then upload
        temp_model_path = f"/tmp/{model_filename}" if os.name != 'nt' else f"temp_{model_filename}"
        joblib.dump(model, temp_model_path)
        
        with open(temp_model_path, "rb") as f:
            model_storage_uri = storage_svc.upload_file(f, f"models/{model_filename}")
            
        try:
            os.remove(temp_model_path)
            os.remove(temp_dataset_path)
        except Exception:
            pass
        
        # Create Model record
        db_model = Model(
            id=model_id,
            job_id=job.id,
            dataset_id=dataset.id,
            model_name=f"Model_{preset}_{task_type}",
            model_type=trainer.model_type,
            parameters=best_params,
            metrics=metrics,
            storage_path=model_storage_uri
        )
        db.add(db_model)
        
        job.results = {
            "model_id": model_id,
            "metrics": metrics,
            "feature_importance": feature_importance
        }
        job.status = "completed"
        job.progress = 100.0
        
        # We also want to record completed at
        from datetime import datetime
        job.completed_at = datetime.utcnow()
        
        db.commit()
        
    except Exception as e:
        import traceback
        job.status = "failed"
        job.error_message = f"{str(e)}\n\n{traceback.format_exc()}"
        db.commit()
    finally:
        db.close()
