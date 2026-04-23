from app.core.celery_app import celery_app
import pandas as pd
import numpy as np
import os
from .hyperparameter_env import HyperparameterOptimizationEnv
from .agent import RLAgentTrainer

@celery_app.task(bind=True, name="app.services.rl.tasks.train_rl_agent")
def train_rl_agent(self, data_path: str, target_column: str, total_timesteps: int = 1000):
    """
    Celery task to train the RL Agent for Hyperparameter Optimization.
    """
    try:
        # Load dataset
        self.update_state(state="PROGRESS", meta={"status": "Loading data"})
        df = pd.read_csv(data_path)
        
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found in dataset.")
            
        X = df.drop(columns=[target_column])
        y = df[target_column]
        
        # Handle simple imputations just in case
        X = X.select_dtypes(include=[np.number]).fillna(X.mean(numeric_only=True))
        
        self.update_state(state="PROGRESS", meta={"status": "Initializing environment"})
        
        env = HyperparameterOptimizationEnv(X, y)
        trainer = RLAgentTrainer(env, model_dir=f"./mlruns/rl_models/{self.request.id}")
        
        self.update_state(state="PROGRESS", meta={"status": "Training agent"})
        
        model_path = trainer.train(
            total_timesteps=total_timesteps,
            experiment_name=f"RL_HPO_{self.request.id}"
        )
        
        return {
            "status": "COMPLETED",
            "model_path": model_path,
            "best_score": env.best_score,
            "best_params": env._map_params()
        }
    except Exception as e:
        self.update_state(state="FAILED", meta={"error": str(e)})
        raise e
