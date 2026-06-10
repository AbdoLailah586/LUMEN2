import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import optuna
import pandas as pd
from lightgbm import LGBMClassifier, LGBMRegressor
from sklearn.ensemble import (
    GradientBoostingClassifier,
    GradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
    VotingClassifier,
    VotingRegressor,
)
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import Pipeline
import xgboost as xgb

optuna.logging.set_verbosity(optuna.logging.WARNING)
logger = logging.getLogger(__name__)

TUNABLE_MODELS = {"XGBoost", "LightGBM", "RandomForest", "GradientBoosting"}


def _cv_score(model, X: pd.DataFrame, y: pd.Series, task_type: str, cv_folds: int) -> float:
    scoring = "f1_weighted" if task_type == "classification" else "r2"
    try:
        scores = cross_val_score(model, X, y, cv=cv_folds, scoring=scoring, n_jobs=1)
        return float(np.mean(scores))
    except Exception:
        return float("-inf") if task_type == "classification" else float("-inf")


def tune_hyperparameters(
    model_name: str,
    X: pd.DataFrame,
    y: pd.Series,
    task_type: str,
    base_params: Dict[str, Any],
    cv_folds: int = 5,
    timeout_seconds: int = 60,
    n_trials: int = 25,
) -> Tuple[Any, Dict[str, Any], float]:
    is_clf = task_type == "classification"

    def objective(trial: optuna.Trial) -> float:
        ne = trial.suggest_int("n_estimators", 50, 300, step=25)
        md = trial.suggest_int("max_depth", 3, 12)
        lr = trial.suggest_float("learning_rate", 0.01, 0.3, log=True)

        if model_name == "XGBoost":
            model = (
                xgb.XGBClassifier(n_estimators=ne, max_depth=md, learning_rate=lr, random_state=42, eval_metric="logloss")
                if is_clf
                else xgb.XGBRegressor(n_estimators=ne, max_depth=md, learning_rate=lr, random_state=42)
            )
        elif model_name == "LightGBM":
            model = (
                LGBMClassifier(n_estimators=ne, max_depth=md, learning_rate=lr, random_state=42, verbose=-1)
                if is_clf
                else LGBMRegressor(n_estimators=ne, max_depth=md, learning_rate=lr, random_state=42, verbose=-1)
            )
        elif model_name == "RandomForest":
            model = (
                RandomForestClassifier(n_estimators=ne, max_depth=md, random_state=42, n_jobs=-1)
                if is_clf
                else RandomForestRegressor(n_estimators=ne, max_depth=md, random_state=42, n_jobs=-1)
            )
        elif model_name == "GradientBoosting":
            model = (
                GradientBoostingClassifier(n_estimators=ne, max_depth=md, learning_rate=lr, random_state=42)
                if is_clf
                else GradientBoostingRegressor(n_estimators=ne, max_depth=md, learning_rate=lr, random_state=42)
            )
        else:
            return float("-inf")

        return _cv_score(model, X, y, task_type, cv_folds)

    study = optuna.create_study(direction="maximize")
    study.optimize(objective, timeout=timeout_seconds, n_trials=n_trials, show_progress_bar=False)

    best = study.best_params
    best_model = _build_model(model_name, best, is_clf)
    best_model.fit(X, y)
    cv = _cv_score(best_model, X, y, task_type, cv_folds)
    return best_model, best, cv


def _build_model(name: str, params: Dict[str, Any], is_clf: bool):
    ne = params.get("n_estimators", 100)
    md = params.get("max_depth", 6)
    lr = params.get("learning_rate", 0.1)
    if name == "XGBoost":
        return xgb.XGBClassifier(n_estimators=ne, max_depth=md, learning_rate=lr, random_state=42, eval_metric="logloss") if is_clf else xgb.XGBRegressor(n_estimators=ne, max_depth=md, learning_rate=lr, random_state=42)
    if name == "LightGBM":
        return LGBMClassifier(n_estimators=ne, max_depth=md, learning_rate=lr, random_state=42, verbose=-1) if is_clf else LGBMRegressor(n_estimators=ne, max_depth=md, learning_rate=lr, random_state=42, verbose=-1)
    if name == "RandomForest":
        return RandomForestClassifier(n_estimators=ne, max_depth=md, random_state=42, n_jobs=-1) if is_clf else RandomForestRegressor(n_estimators=ne, max_depth=md, random_state=42, n_jobs=-1)
    if name == "GradientBoosting":
        return GradientBoostingClassifier(n_estimators=ne, max_depth=md, learning_rate=lr, random_state=42) if is_clf else GradientBoostingRegressor(n_estimators=ne, max_depth=md, learning_rate=lr, random_state=42)
    raise ValueError(f"Cannot build model {name}")


def _supports_soft_voting(estimator) -> bool:
    if hasattr(estimator, "predict_proba"):
        return True
    if isinstance(estimator, Pipeline):
        return hasattr(estimator, "predict_proba")
    return False


def build_ensemble(
    training_results: Dict[str, Dict[str, Any]],
    task_type: str,
    top_k: int = 3,
) -> Tuple[Any, List[str]]:
    is_clf = task_type == "classification"
    valid = [
        (name, res) for name, res in training_results.items()
        if "fitted_model" in res and "error" not in res
    ]
    if len(valid) < 2:
        name, res = valid[0]
        return res["fitted_model"], [name]

    valid.sort(key=lambda x: x[1]["cv_mean_score"], reverse=True)
    top = valid[:top_k]
    estimators = [(name, res["fitted_model"]) for name, res in top]
    names = [name for name, _ in top]

    if is_clf:
        voting = "soft" if all(_supports_soft_voting(est) for _, est in estimators) else "hard"
        ensemble = VotingClassifier(estimators=estimators, voting=voting)
    else:
        ensemble = VotingRegressor(estimators=estimators)

    return ensemble, names


def score_model_cv(
    model,
    X: pd.DataFrame,
    y: pd.Series,
    task_type: str,
    cv_folds: int,
) -> float:
    return _cv_score(model, X, y, task_type, cv_folds)
