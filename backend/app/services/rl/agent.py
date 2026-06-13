import os
import mlflow
import numpy as np
from typing import Dict, Any, Optional
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import BaseCallback, EvalCallback, CheckpointCallback, StopTrainingOnNoModelImprovement
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.env_util import make_vec_env

from .hyperparameter_env import HyperparameterOptimizationEnv

class MLflowCallback(BaseCallback):
    """
    Custom callback for logging to MLflow.
    """
    def __init__(self, verbose=0):
        super().__init__(verbose)
        self.episode_rewards = []

    def _on_step(self) -> bool:
        # Check if an episode just ended
        if self.locals.get("dones") is not None and any(self.locals["dones"]):
            infos = self.locals.get("infos", [])
            for info in infos:
                if "episode" in info:
                    reward = info["episode"]["r"]
                    self.episode_rewards.append(reward)
                    mlflow.log_metric("episode_reward", reward, step=self.num_timesteps)
                
                if "best_score" in info:
                    mlflow.log_metric("best_validation_score", info["best_score"], step=self.num_timesteps)
        return True

class RLAgentTrainer:
    """
    Trainer for RL Agent using Stable-Baselines3.
    """
    def __init__(self, env: HyperparameterOptimizationEnv, model_dir: str = "./models"):
        self.env = Monitor(env) # Monitor is required to record episode stats
        self.model_dir = model_dir
        os.makedirs(self.model_dir, exist_ok=True)
        self.model = None

    def train(self, total_timesteps: int = 1000, eval_freq: int = 100, 
              patience: int = 5, checkpoint_freq: int = 200, 
              experiment_name: str = "RL_Hyperparameter_Optimization"):
        """
        Trains the PPO agent with checkpointing, early stopping, and MLflow logging.
        """
        self.model = PPO("MlpPolicy", self.env, verbose=1)
        
        from app.core.mlflow_config import configure_mlflow

        configure_mlflow()
        mlflow.set_experiment(experiment_name)
        with mlflow.start_run():
            mlflow.log_param("algorithm", "PPO")
            mlflow.log_param("total_timesteps", total_timesteps)
            
            # Checkpointing Callback
            checkpoint_callback = CheckpointCallback(
                save_freq=checkpoint_freq,
                save_path=self.model_dir,
                name_prefix="rl_model"
            )
            
            # Early Stopping Callback (stops if no improvement in eval metric)
            stop_train_callback = StopTrainingOnNoModelImprovement(
                max_no_improvement_evals=patience, 
                min_evals=patience, 
                verbose=1
            )
            
            # Evaluation Callback (acts as validation episodes separate from training)
            # In a real scenario, we would use a separate validation env, but for HP tuning we can use the same env structure.
            eval_env = Monitor(self.env.unwrapped) 
            eval_callback = EvalCallback(
                eval_env, 
                best_model_save_path=self.model_dir,
                log_path=self.model_dir,
                eval_freq=eval_freq,
                callback_after_eval=stop_train_callback,
                deterministic=True,
                render=False
            )
            
            # MLflow Custom Callback
            mlflow_callback = MLflowCallback()

            callbacks = [checkpoint_callback, eval_callback, mlflow_callback]
            
            self.model.learn(total_timesteps=total_timesteps, callback=callbacks)
            
            # Save final model
            final_path = os.path.join(self.model_dir, "rl_model_final.zip")
            self.model.save(final_path)
            mlflow.log_artifact(final_path)
            
            return final_path

    def predict(self, observation: np.ndarray) -> np.ndarray:
        if self.model is None:
            raise ValueError("Model has not been trained or loaded yet.")
        action, _states = self.model.predict(observation, deterministic=True)
        return action
