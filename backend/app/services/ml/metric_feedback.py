from typing import Any, Dict, List


def _grade_classification(metric: str, value: float) -> Dict[str, str]:
    if metric == "accuracy":
        if value >= 0.9:
            return {"grade": "excellent", "label": "Excellent", "color": "green"}
        if value >= 0.75:
            return {"grade": "good", "label": "Good", "color": "blue"}
        if value >= 0.6:
            return {"grade": "fair", "label": "Fair", "color": "amber"}
        return {"grade": "poor", "label": "Needs Improvement", "color": "red"}

    if metric in ("f1", "f1_score", "precision", "recall"):
        if value >= 0.85:
            return {"grade": "excellent", "label": "Excellent", "color": "green"}
        if value >= 0.7:
            return {"grade": "good", "label": "Good", "color": "blue"}
        if value >= 0.55:
            return {"grade": "fair", "label": "Fair", "color": "amber"}
        return {"grade": "poor", "label": "Needs Improvement", "color": "red"}

    return {"grade": "unknown", "label": "N/A", "color": "slate"}


def _grade_regression(metric: str, value: float) -> Dict[str, str]:
    if metric == "r2":
        if value >= 0.85:
            return {"grade": "excellent", "label": "Excellent", "color": "green"}
        if value >= 0.6:
            return {"grade": "good", "label": "Good", "color": "blue"}
        if value >= 0.3:
            return {"grade": "fair", "label": "Fair", "color": "amber"}
        return {"grade": "poor", "label": "Needs Improvement", "color": "red"}

    if metric in ("rmse", "mae", "mse"):
        return {"grade": "info", "label": "Lower is better", "color": "slate"}

    return {"grade": "unknown", "label": "N/A", "color": "slate"}


def build_metric_feedback(metrics: Dict[str, Any], task_type: str) -> List[Dict[str, Any]]:
    feedback = []
    grade_fn = _grade_classification if task_type == "classification" else _grade_regression

    display_metrics = (
        ["accuracy", "f1", "precision", "recall"]
        if task_type == "classification"
        else ["r2", "rmse", "mae", "mse"]
    )

    for key in display_metrics:
        val = metrics.get(key) or metrics.get("f1_score")
        if val is None:
            continue
        grade = grade_fn(key, float(val))
        suggestion = _suggestion_for_metric(key, float(val), task_type, grade["grade"])
        feedback.append({
            "metric": key,
            "value": float(val),
            "grade": grade["grade"],
            "label": grade["label"],
            "color": grade["color"],
            "suggestion": suggestion,
        })

    if metrics.get("cv_f1_mean") is not None:
        feedback.append({
            "metric": "cv_f1_mean",
            "value": float(metrics["cv_f1_mean"]),
            "grade": _grade_classification("f1", float(metrics["cv_f1_mean"]))["grade"],
            "label": f"CV F1: {float(metrics['cv_f1_mean']):.4f} (±{float(metrics.get('cv_f1_std', 0)):.4f})",
            "color": "purple",
            "suggestion": "Cross-validation score indicates generalization stability.",
        })

    baseline = metrics.get("baseline_accuracy")
    accuracy = metrics.get("accuracy")
    if baseline is not None and accuracy is not None:
        lift = float(accuracy) - float(baseline)
        feedback.append({
            "metric": "baseline_accuracy",
            "value": float(baseline),
            "grade": "info",
            "label": "Majority-class baseline",
            "color": "slate",
            "suggestion": (
                f"Always predicting the most common class scores {float(baseline):.4f}. "
                f"Your model is {'+' if lift >= 0 else ''}{lift:.4f} above that baseline."
            ),
        })

    return feedback


def _suggestion_for_metric(metric: str, value: float, task_type: str, grade: str) -> str:
    if grade in ("excellent", "good"):
        return f"Strong {metric} score. Model is performing well on the test split."

    if task_type == "classification":
        suggestions = {
            "accuracy": "Try XGBoost or LightGBM ensembles, increase CV folds, or add feature engineering.",
            "f1": "Class imbalance may be hurting F1. Try CatBoost, class weights, or SMOTE oversampling.",
            "precision": "Too many false positives. Try tighter thresholds or Random Forest with deeper trees.",
            "recall": "Missing positive cases. Try gradient boosting models or reduce regularization.",
        }
    else:
        suggestions = {
            "r2": "Low explained variance. Try XGBoost/LightGBM, polynomial features, or log-transform targets.",
            "rmse": "High prediction error. Ensemble models (XGBoost + LightGBM) often reduce RMSE.",
            "mae": "Large absolute errors. Try robust models like Gradient Boosting or CatBoost.",
            "mse": "Squared errors are high. Outlier-resistant models like Random Forest may help.",
        }

    return suggestions.get(metric, "Consider trying additional models or tuning hyperparameters.")


def build_overall_recommendation(
    metrics: Dict[str, Any],
    task_type: str,
    model_comparison: List[Dict[str, Any]],
    best_model: str,
) -> Dict[str, str]:
    primary = (
        metrics.get("f1") or metrics.get("accuracy") or metrics.get("r2") or 0
    )
    grade = (
        _grade_classification("f1" if task_type == "classification" else "r2", float(primary))["grade"]
        if primary
        else "fair"
    )

    better_models = []
    if model_comparison and len(model_comparison) > 1:
        sorted_models = sorted(
            model_comparison,
            key=lambda m: m.get("cv_mean_score", 0),
            reverse=task_type == "classification",
        )
        if sorted_models[0]["model_name"] != best_model:
            better_models.append(sorted_models[0]["model_name"])

    if grade in ("excellent", "good"):
        return {
            "summary": f"{best_model} delivers solid performance. Ready for deployment or further tuning.",
            "action": "Consider exporting the model or running SHAP analysis for interpretability.",
            "severity": "success",
        }

    alt = better_models[0] if better_models else "XGBoost or LightGBM"
    return {
        "summary": f"Current results have room for improvement. {best_model} may not be the optimal choice.",
        "action": f"Re-train with {alt}, enable hyperparameter optimization, or try an ensemble of top models.",
        "severity": "warning",
    }
