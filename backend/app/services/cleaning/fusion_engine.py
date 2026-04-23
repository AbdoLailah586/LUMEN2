from typing import Dict, Any
import pandas as pd
from .missing_handler import MissingValueHandler
from .outlier_detector import OutlierDetector
from .transformer import DataTransformer

class FusionEngine:
    @classmethod
    def apply_pipeline(cls, df: pd.DataFrame, config: Dict[str, Any]) -> tuple[pd.DataFrame, list[Dict[str, Any]]]:
        """Applies a multi-step cleaning pipeline based on configuration and logs steps."""
        result = df.copy()
        steps_log = []
        
        # 1. Drop Columns
        if "drop_columns" in config and config["drop_columns"]:
            cols_to_drop = [c for c in config["drop_columns"] if c in result.columns]
            if cols_to_drop:
                result = result.drop(columns=cols_to_drop)
                steps_log.append({
                    "action": "drop_columns",
                    "description": f"Dropped {len(cols_to_drop)} columns: {', '.join(cols_to_drop)}"
                })
            
        # 2. Missing Values
        missing_strategy = config.get("missing_strategy", "none") # mean, median, mode, constant, knn, none
        if missing_strategy and missing_strategy != "none":
            handler = MissingValueHandler()
            fill_value = config.get("missing_fill_value", None)
            
            if missing_strategy == "knn":
                from sklearn.impute import KNNImputer
                import numpy as np
                numeric_cols = result.select_dtypes(include=[np.number]).columns
                if len(numeric_cols) > 0:
                    imputer = KNNImputer(n_neighbors=5)
                    result[numeric_cols] = imputer.fit_transform(result[numeric_cols])
                    steps_log.append({
                        "action": "missing_values",
                        "description": f"Imputed missing values using KNN algorithm on {len(numeric_cols)} numeric columns."
                    })
            else:
                result = handler.detect_and_fill(result, strategy=missing_strategy, fill_value=fill_value)
                steps_log.append({
                    "action": "missing_values",
                    "description": f"Handled missing values using strategy '{missing_strategy}'" + (f" with value '{fill_value}'" if fill_value else "")
                })
            
        # 3. Handle outliers
        outlier_method = config.get("outlier_method", "none") # zscore, iqr, none
        outlier_action = config.get("outlier_action", "clip") # clip, drop, winsorize
        if outlier_method and outlier_method != "none":
            detector = OutlierDetector()
            outlier_threshold = config.get("outlier_threshold", 3.0)
            result = detector.detect_and_handle(result, method=outlier_method, threshold=outlier_threshold, action=outlier_action)
            steps_log.append({
                "action": "outliers",
                "description": f"Handled outliers using method '{outlier_method}' with threshold {outlier_threshold} via action '{outlier_action}'"
            })
            
        # 4. Transformations
        scaling_method = config.get("scaling_method", "none") # standard, minmax, none
        encoding_method = config.get("encoding_method", "none") # label, onehot, none
        if scaling_method == "none": scaling_method = None
        if encoding_method == "none": encoding_method = None
        
        if scaling_method or encoding_method:
            transformer = DataTransformer()
            result = transformer.transform(result, scaling_method=scaling_method, encoding_method=encoding_method)
            steps_log.append({
                "action": "transformation",
                "description": f"Applied transformations - Scaling: {scaling_method or 'none'}, Encoding: {encoding_method or 'none'}"
            })
            
        # 4.5. Log Transform
        if config.get("apply_log_transform", False):
            import numpy as np
            numeric_cols = result.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 0:
                result[numeric_cols] = np.log1p(result[numeric_cols].clip(lower=0))
                steps_log.append({
                    "action": "log_transform",
                    "description": f"Applied log1p transform to {len(numeric_cols)} numeric columns"
                })
            
        # 5. Drop Duplicates
        if config.get("drop_duplicates", False):
            initial_rows = len(result)
            result = result.drop_duplicates()
            dropped = initial_rows - len(result)
            if dropped > 0:
                steps_log.append({
                    "action": "drop_duplicates",
                    "description": f"Dropped {dropped} duplicate rows"
                })
            
        return result, steps_log
