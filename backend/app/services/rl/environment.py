import gymnasium as gym
from typing import Any, Dict, Tuple, Optional
import numpy as np

class BaseMLEnv(gym.Env):
    """
    Base environment for Machine Learning tasks formulated as RL problems.
    Inherits from gymnasium.Env.
    """
    metadata = {"render_modes": ["human"]}

    def __init__(self, render_mode: Optional[str] = None):
        super().__init__()
        self.render_mode = render_mode
        self.current_step = 0
        self.max_steps = 100 # Default

    def reset(self, seed: Optional[int] = None, options: Optional[dict] = None) -> Tuple[Any, Dict[str, Any]]:
        super().reset(seed=seed)
        self.current_step = 0
        return self._get_observation(), self._get_info()

    def step(self, action: Any) -> Tuple[Any, float, bool, bool, Dict[str, Any]]:
        self.current_step += 1
        
        # Apply action to environment
        self._apply_action(action)
        
        # Calculate reward
        reward = self._calculate_reward()
        
        # Check termination and truncation
        terminated = self._is_terminated()
        truncated = self.current_step >= self.max_steps
        
        return self._get_observation(), reward, terminated, truncated, self._get_info()

    def _get_observation(self) -> Any:
        raise NotImplementedError

    def _apply_action(self, action: Any) -> None:
        raise NotImplementedError

    def _calculate_reward(self) -> float:
        raise NotImplementedError

    def _is_terminated(self) -> bool:
        return self.current_step >= self.max_steps
        
    def _get_info(self) -> Dict[str, Any]:
        return {"step": self.current_step}

    def render(self):
        pass
