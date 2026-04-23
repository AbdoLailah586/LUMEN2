import shap
import numpy as np
import pandas as pd

class ModelExplainer:
    def explain(self, model, X, feature_names=None):
        """
        Generate SHAP values for feature importance.
        Returns a dictionary mapping feature names to their average absolute SHAP values.
        """
        if isinstance(X, pd.DataFrame):
            feature_names = X.columns.tolist()
            X_eval = X.values
        else:
            X_eval = X
            if feature_names is None:
                feature_names = [f"feature_{i}" for i in range(X_eval.shape[1])]
                
        # Handle larger datasets by taking a sample
        if X_eval.shape[0] > 100:
            np.random.seed(42)
            indices = np.random.choice(X_eval.shape[0], 100, replace=False)
            X_sample = X_eval[indices]
        else:
            X_sample = X_eval
            
        try:
            # Tree explainer covers RandomForest and XGBoost
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X_sample)
            
            # Handle list output for classification (multiclass) safely
            if isinstance(shap_values, list):
                shap_values = np.mean([np.abs(sv) for sv in shap_values], axis=0)
            elif len(shap_values.shape) == 3: # Some versions of shap output 3D arrays for multiclass
                shap_values = np.mean(np.abs(shap_values), axis=2)
            else:
                shap_values = np.abs(shap_values)
                
            mean_shap = np.mean(shap_values, axis=0)
            
            importance_dict = {str(name): float(val) for name, val in zip(feature_names, mean_shap)}
            # Sort by importance descending
            sorted_importance = dict(sorted(importance_dict.items(), key=lambda item: item[1], reverse=True))
            return sorted_importance
            
        except Exception as e:
            print(f"SHAP explanation failed: {e}")
            # Fallback to model's feature_importances_ if available
            if hasattr(model, 'feature_importances_'):
                importances = model.feature_importances_
                importance_dict = {str(name): float(val) for name, val in zip(feature_names, importances)}
                return dict(sorted(importance_dict.items(), key=lambda item: item[1], reverse=True))
            return {}
