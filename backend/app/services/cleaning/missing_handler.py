import pandas as pd
from sklearn.impute import KNNImputer
from typing import Dict, Optional, Any


class MissingValueHandler:
    def fill_per_column(
        self,
        df: pd.DataFrame,
        column_strategies: Dict[str, str],
        global_strategy: str = "none",
        fill_value: Any = None,
        column_fill_values: Optional[Dict[str, Any]] = None,
    ) -> pd.DataFrame:
        result = df.copy()
        column_fill_values = column_fill_values or {}

        for col in result.columns:
            strategy = column_strategies.get(col, global_strategy)
            if not strategy or strategy == "none":
                continue
            col_fill = column_fill_values.get(col, fill_value)
            self._fill_column(result, col, strategy, col_fill)

        return result

    def _fill_column(
        self, df: pd.DataFrame, col: str, strategy: str, fill_value: Any = None
    ) -> None:
        if df[col].isnull().sum() == 0:
            return

        is_numeric = pd.api.types.is_numeric_dtype(df[col])

        if strategy == "auto":
            if is_numeric:
                skew = df[col].skew()
                fill = df[col].median() if pd.notna(skew) and abs(skew) > 1 else df[col].mean()
                df[col] = df[col].fillna(fill)
            else:
                mode_val = df[col].mode()
                if not mode_val.empty:
                    df[col] = df[col].fillna(mode_val.iloc[0])
        elif strategy == "mean" and is_numeric:
            df[col] = df[col].fillna(df[col].mean())
        elif strategy == "median" and is_numeric:
            df[col] = df[col].fillna(df[col].median())
        elif strategy == "zero" and is_numeric:
            df[col] = df[col].fillna(0)
        elif strategy == "mode":
            mode_val = df[col].mode()
            if not mode_val.empty:
                df[col] = df[col].fillna(mode_val.iloc[0])
        elif strategy in ("mean", "median") and not is_numeric:
            mode_val = df[col].mode()
            if not mode_val.empty:
                df[col] = df[col].fillna(mode_val.iloc[0])
        elif strategy == "constant" and fill_value is not None:
            df[col] = df[col].fillna(fill_value)
        elif strategy == "forward_fill":
            df[col] = df[col].ffill()
        elif strategy == "backward_fill":
            df[col] = df[col].bfill()
        elif strategy == "drop_rows":
            pass  # handled separately in pipeline

    def detect_and_fill(self, df: pd.DataFrame, strategy: str = "mean", fill_value: any = None) -> pd.DataFrame:
        result = df.copy()
        
        # Handle simple strategies per column
        for col in result.columns:
            if result[col].isnull().sum() == 0:
                continue
            
            is_numeric = pd.api.types.is_numeric_dtype(result[col])
            
            if strategy == 'auto':
                if is_numeric:
                    skew = result[col].skew()
                    if pd.notna(skew) and abs(skew) > 1:
                        result[col] = result[col].fillna(result[col].median())
                    else:
                        result[col] = result[col].fillna(result[col].mean())
                else:
                    mode_val = result[col].mode()
                    if not mode_val.empty:
                        result[col] = result[col].fillna(mode_val.iloc[0])
            elif strategy == 'mean' and is_numeric:
                result[col] = result[col].fillna(result[col].mean())
            elif strategy == 'median' and is_numeric:
                result[col] = result[col].fillna(result[col].median())
            elif strategy in ['mode', 'mean', 'median'] and not is_numeric:
                # Fallback to mode for non-numeric if mean/median selected
                mode_val = result[col].mode()
                if not mode_val.empty:
                    result[col] = result[col].fillna(mode_val.iloc[0])
            elif strategy == 'mode':
                mode_val = result[col].mode()
                if not mode_val.empty:
                    result[col] = result[col].fillna(mode_val.iloc[0])
            elif strategy == 'zero' and is_numeric:
                result[col] = result[col].fillna(0)
            elif strategy == 'constant' and fill_value is not None:
                result[col] = result[col].fillna(fill_value)
            elif strategy == 'forward_fill':
                result[col] = result[col].ffill()
            elif strategy == 'backward_fill':
                result[col] = result[col].bfill()
        
        # Handle advanced strategies
        if strategy == 'knn':
            numeric_cols = result.select_dtypes(include=['number']).columns
            if len(numeric_cols) > 0:
                imputer = KNNImputer(n_neighbors=5)
                # Ensure we only impute if there are missing values in numeric cols
                if result[numeric_cols].isnull().sum().sum() > 0:
                    result[numeric_cols] = imputer.fit_transform(result[numeric_cols])
                
        return result
