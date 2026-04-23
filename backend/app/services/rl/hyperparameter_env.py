import gymnasium as gym
from gymnasium import spaces
import numpy as np
import pandas as pd
from typing import Any, Dict, Tuple, Optional
from sklearn.model_selection import cross_val_score
from sklearn.ensemble import RandomForestClassifier

from .environment import BaseMLEnv

class HyperparameterOptimizationEnv(BaseMLEnv):
    """
    RL Environment for Hyperparameter Optimization.
    The agent learns to adjust hyperparameters to maximize validation accuracy.
    """
    
    def __init__(self, X: pd.DataFrame, y: pd.Series, max_steps: int = 50, render_mode: Optional[str] = None):
        super().__init__(render_mode)
        self.X = X
        self.y = y
        self.max_steps = max_steps
        
        # Define hyperparameter bounds for RandomForest
        # 1. n_estimators: [10, 500] (mapped to [-1, 1])
        # 2. max_depth: [2, 50] (mapped to [-1, 1])
        # 3. min_samples_split: [2, 20] (mapped to [-1, 1])
        
        self.action_space = spaces.Box(low=-0.1, high=0.1, shape=(3,), dtype=np.float32)
        
        # State: current hyperparameters (normalized [-1, 1]) + best score so far
        self.observation_space = spaces.Box(low=-1.0, high=1.0, shape=(4,), dtype=np.float32)
        
        self.current_params = np.array([0.0, 0.0, 0.0], dtype=np.float32) # Start in the middle
        self.best_score = 0.0
        self.current_score = 0.0

    def _get_observation(self) -> np.ndarray:
        return np.concatenate([self.current_params, [self.best_score]], dtype=np.float32)

    def _apply_action(self, action: np.ndarray) -> None:
        # Action is a delta to apply to the current parameters
        self.current_params = np.clip(self.current_params + action, -1.0, 1.0)
        
    def _map_params(self):
        # Map from [-1, 1] to actual hyperparameter ranges
        n_estimators = int(np.interp(self.current_params[0], [-1, 1], [10, 500]))
        max_depth = int(np.interp(self.current_params[1], [-1, 1], [2, 50]))
        min_samples_split = int(np.interp(self.current_params[2], [-1, 1], [2, 20]))
        return {
            "n_estimators": n_estimators,
            "max_depth": max_depth,
            "min_samples_split": min_samples_split,
            "random_state": 42
        }

    def _calculate_reward(self) -> float:
        params = self._map_params()
        
        # Train and evaluate model
        model = RandomForestClassifier(**params)
        
        # Use 3-fold cross-validation for speed
        try:
            scores = cross_val_score(model, self.X, self.y, cv=3, scoring='accuracy')
            score = np.mean(scores)
        except Exception:
            score = 0.0 # Penalty for invalid params, though mapped ones should be valid

        self.current_score = score
        
        # Reward shaping: balance exploration vs exploitation
        # Reward is based on improvement over the best score
        if score > self.best_score:
            reward = (score - self.best_score) * 100  # High reward for improvement
            self.best_score = score
        else:
            # Small penalty to encourage finding better params and avoid getting stuck
            reward = -0.1 
            
        return reward

    def _get_info(self) -> Dict[str, Any]:
        info = super()._get_info()
        info.update({
            "current_score": self.current_score,
            "best_score": self.best_score,
            "params": self._map_params()
        })
        return info
