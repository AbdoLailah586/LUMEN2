import pytest
import pandas as pd
import numpy as np
from app.services.rl.hyperparameter_env import HyperparameterOptimizationEnv

def test_hyperparameter_env_initialization():
    # Create dummy data
    X = pd.DataFrame(np.random.rand(100, 5), columns=[f"col_{i}" for i in range(5)])
    y = pd.Series(np.random.randint(0, 2, 100))
    
    env = HyperparameterOptimizationEnv(X, y)
    
    assert env.action_space.shape == (3,)
    assert env.observation_space.shape == (4,)
    
    obs, info = env.reset()
    assert obs.shape == (4,)
    assert isinstance(info, dict)
    
def test_hyperparameter_env_step():
    X = pd.DataFrame(np.random.rand(100, 5), columns=[f"col_{i}" for i in range(5)])
    y = pd.Series(np.random.randint(0, 2, 100))
    
    env = HyperparameterOptimizationEnv(X, y, max_steps=5)
    env.reset()
    
    # Take a step
    action = np.array([0.01, -0.05, 0.0])
    obs, reward, terminated, truncated, info = env.step(action)
    
    assert obs.shape == (4,)
    assert isinstance(reward, float)
    assert not terminated
    assert not truncated
    
    # Take more steps to truncation
    for _ in range(4):
        obs, reward, terminated, truncated, info = env.step(action)
        
    assert truncated
