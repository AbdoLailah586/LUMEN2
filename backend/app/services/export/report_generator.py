class ReportGenerator:
    @staticmethod
    def generate(model_db) -> str:
        metrics_str = "\\n".join([f"- **{k}**: {v:.4f}" for k, v in model_db.metrics.items()])
        
        feature_importance = model_db.job.results.get("feature_importance", {}) if model_db.job and model_db.job.results else {}
        top_features = list(feature_importance.items())[:10]
        features_str = "\\n".join([f"- **{k}**: {v:.4f}" for k, v in top_features])
        
        report = f"""# Model Training Report
## Model Overview
- **Name**: {model_db.model_name}
- **Type**: {model_db.model_type}
- **Backend**: scikit-learn

## Performance Metrics
{metrics_str}

## Top 10 Feature Importance (SHAP)
{features_str}
"""
        return report
