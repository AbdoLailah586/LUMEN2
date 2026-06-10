from typing import Dict, Any
import pandas as pd
import numpy as np
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
        if config.get("drop_columns"):
            cols_to_drop = [c for c in config["drop_columns"] if c in result.columns]
            if cols_to_drop:
                result = result.drop(columns=cols_to_drop)
                steps_log.append({
                    "action": "drop_columns",
                    "description": f"Dropped {len(cols_to_drop)} columns: {', '.join(cols_to_drop)}"
                })

        # 2. String cleaning
        if config.get("strip_whitespace"):
            text_cols = result.select_dtypes(include=["object"]).columns
            for col in text_cols:
                result[col] = result[col].apply(
                    lambda v: v.strip() if isinstance(v, str) else v
                )
            steps_log.append({
                "action": "strip_whitespace",
                "description": f"Trimmed whitespace in {len(text_cols)} text columns"
            })

        if config.get("lowercase_text"):
            text_cols = result.select_dtypes(include=["object"]).columns
            for col in text_cols:
                result[col] = result[col].apply(
                    lambda v: v.lower() if isinstance(v, str) else v
                )
            steps_log.append({
                "action": "lowercase_text",
                "description": f"Lowercased {len(text_cols)} text columns"
            })

        # 3. Type conversions
        type_conversions = config.get("column_type_conversions") or {}
        converted = []
        for col, target_type in type_conversions.items():
            if col not in result.columns or not target_type or target_type == "auto":
                continue
            try:
                if target_type == "int":
                    result[col] = pd.to_numeric(result[col], errors="coerce").astype("Int64")
                elif target_type == "float":
                    result[col] = pd.to_numeric(result[col], errors="coerce")
                elif target_type == "str":
                    result[col] = result[col].astype(str).replace("nan", np.nan)
                elif target_type == "category":
                    result[col] = result[col].astype("category")
                elif target_type == "datetime":
                    result[col] = pd.to_datetime(result[col], errors="coerce")
                converted.append(f"{col}→{target_type}")
            except Exception:
                continue
        if converted:
            steps_log.append({
                "action": "type_conversion",
                "description": f"Converted column types: {', '.join(converted)}"
            })

        # 4. Missing values (per-column strategies take priority)
        column_strategies = config.get("column_strategies") or {}
        global_strategy = config.get("missing_strategy", "none")
        handler = MissingValueHandler()

        if column_strategies:
            drop_cols = [
                col for col, strat in column_strategies.items()
                if strat == "drop_rows" and col in result.columns
            ]
            if drop_cols:
                for col in drop_cols:
                    before = len(result)
                    result = result.dropna(subset=[col])
                    dropped = before - len(result)
                    if dropped > 0:
                        steps_log.append({
                            "action": "drop_missing_rows",
                            "description": f"Dropped {dropped} rows with missing values in '{col}'"
                        })

            strategies = {
                col: strat for col, strat in column_strategies.items()
                if strat != "drop_rows"
            }
            if strategies or global_strategy not in (None, "none"):
                result = handler.fill_per_column(
                    result,
                    strategies,
                    global_strategy=global_strategy,
                    fill_value=config.get("missing_fill_value"),
                    column_fill_values=config.get("column_fill_values") or {},
                )
                steps_log.append({
                    "action": "missing_values",
                    "description": "Handled missing values using per-column strategies"
                })
        elif global_strategy and global_strategy != "none":
            fill_value = config.get("missing_fill_value")
            if global_strategy == "knn":
                numeric_cols = result.select_dtypes(include=[np.number]).columns
                if len(numeric_cols) > 0:
                    from sklearn.impute import KNNImputer
                    imputer = KNNImputer(n_neighbors=5)
                    result[numeric_cols] = imputer.fit_transform(result[numeric_cols])
                    steps_log.append({
                        "action": "missing_values",
                        "description": f"Imputed missing values using KNN on {len(numeric_cols)} numeric columns"
                    })
            else:
                result = handler.detect_and_fill(result, strategy=global_strategy, fill_value=fill_value)
                steps_log.append({
                    "action": "missing_values",
                    "description": f"Handled missing values using strategy '{global_strategy}'"
                    + (f" with value '{fill_value}'" if fill_value else "")
                })

        # 5. Outliers
        outlier_method = config.get("outlier_method", "none")
        outlier_action = config.get("outlier_action", "clip")
        if outlier_method and outlier_method != "none":
            detector = OutlierDetector()
            outlier_threshold = config.get("outlier_threshold", 3.0)
            result = detector.detect_and_handle(
                result,
                method=outlier_method,
                threshold=outlier_threshold,
                action=outlier_action,
            )
            steps_log.append({
                "action": "outliers",
                "description": (
                    f"Handled outliers using '{outlier_method}' "
                    f"(threshold {outlier_threshold}, action '{outlier_action}')"
                )
            })

        # 6. Transformations (scaling + encoding)
        scaling_method = config.get("scaling_method", "none")
        encoding_method = config.get("encoding_method", "none")
        if scaling_method == "none":
            scaling_method = None
        if encoding_method == "none":
            encoding_method = None

        if scaling_method or encoding_method:
            transformer = DataTransformer()
            result = transformer.transform(
                result, scaling_method=scaling_method, encoding_method=encoding_method
            )
            steps_log.append({
                "action": "transformation",
                "description": (
                    f"Applied transformations — scaling: {scaling_method or 'none'}, "
                    f"encoding: {encoding_method or 'none'}"
                )
            })

        # 7. Log transform
        if config.get("apply_log_transform"):
            numeric_cols = result.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 0:
                result[numeric_cols] = np.log1p(result[numeric_cols].clip(lower=0))
                steps_log.append({
                    "action": "log_transform",
                    "description": f"Applied log1p transform to {len(numeric_cols)} numeric columns"
                })

        # 8. Drop duplicates
        if config.get("drop_duplicates"):
            initial_rows = len(result)
            result = result.drop_duplicates()
            dropped = initial_rows - len(result)
            if dropped > 0:
                steps_log.append({
                    "action": "drop_duplicates",
                    "description": f"Dropped {dropped} duplicate rows"
                })

        return result, steps_log
