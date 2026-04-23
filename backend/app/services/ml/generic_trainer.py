"""
Train models on any dataset for continuous/categorical targets.
Supports parallel execution and Cross-Validation.
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple
from sklearn.model_selection import cross_val_score, StratifiedKFold, KFold
from sklearn.metrics import accuracy_score, mean_squared_error, r2_score
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

# Supported libraries (Assuming they are in requirements)
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
import xgboost as xgb
import lightgbm as lgb
from catboost import CatBoostClassifier, CatBoostRegressor

class GenericTrainer:
    def __init__(self, target_column: str, is_classification: bool = None, cv_folds: int = 5):
        self.target_column = target_column
        self.is_classification = is_classification
        self.cv_folds = cv_folds
        
    def _detect_task_type(self, y: pd.Series) -> bool:
        """Auto-detects if task is classification based on dtype and cardinality."""
        if self.is_classification is not None:
            return self.is_classification
            
        if pd.api.types.is_numeric_dtype(y):
            # If numeric but low cardinality, assume classification
            if y.nunique() < 20:
                return True
            return False
        return True # Default to classification for object/string targets
        
    def _get_models(self) -> Dict[str, Any]:
        """Returns instantiated models based on task type."""
        if self.is_classification:
            return {
                "RandomForest": RandomForestClassifier(random_state=42),
                "XGBoost": xgb.XGBClassifier(random_state=42, use_label_encoder=False, eval_metric='logloss'),
                "LightGBM": lgb.LGBMClassifier(random_state=42),
                "CatBoost": CatBoostClassifier(random_state=42, verbose=0)
            }
        else:
            return {
                "RandomForest": RandomForestRegressor(random_state=42),
                "XGBoost": xgb.XGBRegressor(random_state=42),
                "LightGBM": lgb.LGBMRegressor(random_state=42),
                "CatBoost": CatBoostRegressor(random_state=42, verbose=0)
            }

    def train_single_model(self, name: str, model: Any, X: pd.DataFrame, y: pd.Series) -> Dict[str, Any]:
        """Trains and evaluates a single model using cross-validation."""
        start_time = time.time()
        
        cv_strategy = StratifiedKFold(n_splits=self.cv_folds, shuffle=True, random_state=42) if self.is_classification else KFold(n_splits=self.cv_folds, shuffle=True, random_state=42)
        
        scoring = 'accuracy' if self.is_classification else 'neg_mean_squared_error'
        
        # Calculate CV Score
        cv_scores = cross_val_score(model, X, y, cv=cv_strategy, scoring=scoring, n_jobs=1) # Models handle their own core util
        
        # Fit on full data for final model
        model.fit(X, y)
        
        end_time = time.time()
        
        if not self.is_classification:
            cv_scores = -cv_scores # Convert back to positive MSE
            
        return {
            "model_name": name,
            "fitted_model": model,
            "cv_mean_score": float(np.mean(cv_scores)),
            "cv_std_score": float(np.std(cv_scores)),
            "metric_used": "Accuracy" if self.is_classification else "MSE",
            "training_time_seconds": round(end_time - start_time, 2)
        }

    def train(self, X: pd.DataFrame, y: pd.Series, models_config: Dict[str, Any] = None) -> Dict[str, Dict[str, Any]]:
        """Trains multiple models in parallel."""
        self.is_classification = self._detect_task_type(y)
        models_to_train = self._get_models()
        
        if models_config and "selected_models" in models_config:
            models_to_train = {k: v for k, v in models_to_train.items() if k in models_config["selected_models"]}
            
        results = {}
        
        # Execute training in parallel
        with ThreadPoolExecutor(max_workers=min(4, len(models_to_train))) as executor:
            future_to_model = {
                executor.submit(self.train_single_model, name, model, X, y): name 
                for name, model in models_to_train.items()
            }
            
            for future in as_completed(future_to_model):
                name = future_to_model[future]
                try:
                    res = future.result()
                    results[name] = res
                except Exception as exc:
                    results[name] = {"error": str(exc), "model_name": name}
                    print(f'{name} generated an exception: {exc}')
                    
        return results
