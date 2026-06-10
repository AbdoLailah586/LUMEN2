"""
Train models on any dataset for continuous/categorical targets.
Supports parallel execution and Cross-Validation.
"""
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional

import logging

import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.ensemble import (
    ExtraTreesClassifier,
    ExtraTreesRegressor,
    GradientBoostingClassifier,
    GradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import accuracy_score, mean_squared_error
from sklearn.model_selection import KFold, StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.svm import SVC, SVR
import xgboost as xgb

logger = logging.getLogger(__name__)

_CATBOOST = None
_CATBOOST_LOAD_ATTEMPTED = False


def _get_catboost_classes():
    """Lazy-load CatBoost so the app can start if the native DLL is unavailable."""
    global _CATBOOST, _CATBOOST_LOAD_ATTEMPTED
    if _CATBOOST_LOAD_ATTEMPTED:
        return _CATBOOST
    _CATBOOST_LOAD_ATTEMPTED = True
    try:
        from catboost import CatBoostClassifier, CatBoostRegressor
        _CATBOOST = (CatBoostClassifier, CatBoostRegressor)
    except Exception as exc:
        logger.warning("CatBoost unavailable (%s). CatBoost will be skipped.", exc)
        _CATBOOST = None
    return _CATBOOST


def catboost_available() -> bool:
    return _get_catboost_classes() is not None


MODEL_ALIASES = {
    "RandomForestClassifier": "RandomForest",
    "RandomForestRegressor": "RandomForest",
    "XGBClassifier": "XGBoost",
    "XGBRegressor": "XGBoost",
    "LGBMClassifier": "LightGBM",
    "LGBMRegressor": "LightGBM",
    "LogisticRegression": "LogisticRegression",
    "LinearRegression": "LinearRegression",
    "SVC": "SVM",
    "SVR": "SVM",
    "GradientBoostingClassifier": "GradientBoosting",
    "GradientBoostingRegressor": "GradientBoosting",
    "ExtraTreesClassifier": "ExtraTrees",
    "ExtraTreesRegressor": "ExtraTrees",
    "KNeighborsClassifier": "KNeighbors",
    "KNeighborsRegressor": "KNeighbors",
}

ALL_MODEL_KEYS = [
    "XGBoost",
    "RandomForest",
    "LightGBM",
    "CatBoost",
    "LogisticRegression",
    "SVM",
    "GradientBoosting",
    "ExtraTrees",
    "KNeighbors",
]


class GenericTrainer:
    def __init__(
        self,
        target_column: str,
        is_classification: bool = None,
        cv_folds: int = 5,
        hyperparameters: Optional[Dict[str, Any]] = None,
    ):
        self.target_column = target_column
        self.is_classification = is_classification
        self.cv_folds = cv_folds
        self.hyperparameters = hyperparameters or {}

    def _detect_task_type(self, y: pd.Series) -> bool:
        if self.is_classification is not None:
            return self.is_classification

        if pd.api.types.is_numeric_dtype(y):
            return y.nunique() < 20
        return True

    def _get_models(self) -> Dict[str, Any]:
        lr = self.hyperparameters.get("learning_rate", 0.1)
        md = self.hyperparameters.get("max_depth", 6)
        ne = int(self.hyperparameters.get("n_estimators", 100))

        if self.is_classification:
            models = {
                "RandomForest": RandomForestClassifier(
                    n_estimators=ne, max_depth=md, random_state=42, n_jobs=-1,
                    class_weight="balanced",
                ),
                "XGBoost": xgb.XGBClassifier(
                    n_estimators=ne,
                    max_depth=md,
                    learning_rate=lr,
                    random_state=42,
                    eval_metric="logloss",
                ),
                "LightGBM": lgb.LGBMClassifier(
                    n_estimators=ne,
                    max_depth=md,
                    learning_rate=lr,
                    random_state=42,
                    verbose=-1,
                    class_weight="balanced",
                ),
                "LogisticRegression": LogisticRegression(
                    max_iter=1000, random_state=42, class_weight="balanced",
                ),
                "SVM": SVC(
                    kernel="rbf", probability=True, random_state=42, class_weight="balanced",
                ),
                "GradientBoosting": GradientBoostingClassifier(
                    n_estimators=ne, max_depth=md, learning_rate=lr, random_state=42
                ),
                "ExtraTrees": ExtraTreesClassifier(
                    n_estimators=ne, max_depth=md, random_state=42, n_jobs=-1,
                    class_weight="balanced",
                ),
                "KNeighbors": KNeighborsClassifier(n_neighbors=5, weights="distance"),
            }
        else:
            models = {
                "RandomForest": RandomForestRegressor(
                    n_estimators=ne, max_depth=md, random_state=42, n_jobs=-1
                ),
                "XGBoost": xgb.XGBRegressor(
                    n_estimators=ne,
                    max_depth=md,
                    learning_rate=lr,
                    random_state=42,
                ),
                "LightGBM": lgb.LGBMRegressor(
                    n_estimators=ne,
                    max_depth=md,
                    learning_rate=lr,
                    random_state=42,
                    verbose=-1,
                ),
                "LinearRegression": LinearRegression(),
                "SVM": SVR(kernel="rbf"),
                "GradientBoosting": GradientBoostingRegressor(
                    n_estimators=ne, max_depth=md, learning_rate=lr, random_state=42
                ),
                "ExtraTrees": ExtraTreesRegressor(
                    n_estimators=ne, max_depth=md, random_state=42, n_jobs=-1
                ),
                "KNeighbors": KNeighborsRegressor(n_neighbors=5),
            }

        catboost = _get_catboost_classes()
        if catboost:
            CatBoostClassifier, CatBoostRegressor = catboost
            if self.is_classification:
                models["CatBoost"] = CatBoostClassifier(
                    iterations=ne,
                    depth=md,
                    learning_rate=lr,
                    random_state=42,
                    verbose=0,
                    auto_class_weights="Balanced",
                )
            else:
                models["CatBoost"] = CatBoostRegressor(
                    iterations=ne,
                    depth=md,
                    learning_rate=lr,
                    random_state=42,
                    verbose=0,
                )

        return models

    @staticmethod
    def normalize_model_names(names: List[str]) -> List[str]:
        normalized = []
        for name in names:
            key = MODEL_ALIASES.get(name, name)
            if key not in normalized:
                normalized.append(key)
        return normalized

    def _needs_scaling(self, name: str) -> bool:
        return name in {"SVM", "KNeighbors", "LogisticRegression", "LinearRegression"}

    def _wrap_model(self, name: str, model: Any) -> Any:
        if self._needs_scaling(name):
            return Pipeline([("scaler", StandardScaler()), ("model", model)])
        return model

    def train_single_model(self, name: str, model: Any, X: pd.DataFrame, y: pd.Series) -> Dict[str, Any]:
        start_time = time.time()
        pipeline = self._wrap_model(name, model)

        cv_strategy = (
            StratifiedKFold(n_splits=self.cv_folds, shuffle=True, random_state=42)
            if self.is_classification
            else KFold(n_splits=self.cv_folds, shuffle=True, random_state=42)
        )
        scoring = "f1_weighted" if self.is_classification else "r2"

        cv_scores = cross_val_score(pipeline, X, y, cv=cv_strategy, scoring=scoring, n_jobs=1)
        pipeline.fit(X, y)

        return {
            "model_name": name,
            "fitted_model": pipeline,
            "cv_mean_score": float(np.mean(cv_scores)),
            "cv_std_score": float(np.std(cv_scores)),
            "metric_used": "F1" if self.is_classification else "R2",
            "training_time_seconds": round(time.time() - start_time, 2),
        }

    def train(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        selected_models: Optional[List[str]] = None,
        on_model_complete=None,
    ) -> Dict[str, Dict[str, Any]]:
        if self.is_classification is None:
            self.is_classification = self._detect_task_type(y)
        models_to_train = self._get_models()

        if selected_models:
            selected_models = self.normalize_model_names(selected_models)
            models_to_train = {
                k: v for k, v in models_to_train.items() if k in selected_models
            }

        if not models_to_train:
            models_to_train = {"RandomForest": self._get_models()["RandomForest"]}

        results = {}
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
                    if on_model_complete:
                        on_model_complete(name, res)
                except Exception as exc:
                    results[name] = {"error": str(exc), "model_name": name}
                    if on_model_complete:
                        on_model_complete(name, {"error": str(exc)})

        return results

    def pick_best_model(self, results: Dict[str, Dict[str, Any]]) -> str:
        valid = {
            k: v for k, v in results.items()
            if "cv_mean_score" in v and "error" not in v
        }
        if not valid:
            raise ValueError("No models trained successfully")

        return max(valid, key=lambda k: valid[k]["cv_mean_score"])
