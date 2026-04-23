"""
Generic Data Cleaner for any dataset.
Handles missing values and outlier detection based on column types.
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from sklearn.ensemble import IsolationForest

class GenericDataCleaner:
    def __init__(self, config: Dict[str, Any] = None):
        """
        config example:
        {
            "imputation": {
                "numerical": "mean", # mean, median, zero
                "categorical": "mode", # mode, missing
            },
            "outliers": {
                "method": "zscore", # zscore, iqr, isolation_forest, none
                "zscore_threshold": 3.0,
                "action": "cap" # cap, drop, ignore
            }
        }
        """
        self.config = config or self._default_config()
        
    def _default_config(self) -> Dict[str, Any]:
        return {
            "imputation": {
                "numerical": "mean",
                "categorical": "mode",
            },
            "outliers": {
                "method": "iqr",
                "zscore_threshold": 3.0,
                "action": "cap" 
            }
        }

    def clean(self, df: pd.DataFrame, column_types: Dict[str, str]) -> pd.DataFrame:
        """Applies configured cleaning strategies in place."""
        df_cleaned = df.copy()
        
        # 1. Handle Missing Values
        df_cleaned = self._impute_missing(df_cleaned, column_types)
        
        # 2. Handle Outliers (Only on numerical columns)
        numerical_cols = [col for col, ctype in column_types.items() if ctype == "numerical"]
        if numerical_cols and self.config["outliers"]["method"] != "none":
            df_cleaned = self._handle_outliers(df_cleaned, numerical_cols)
            
        return df_cleaned

    def _impute_missing(self, df: pd.DataFrame, column_types: Dict[str, str]) -> pd.DataFrame:
        num_strategy = self.config["imputation"].get("numerical", "mean")
        cat_strategy = self.config["imputation"].get("categorical", "mode")
        
        for col, ctype in column_types.items():
            if df[col].isnull().sum() == 0:
                continue
                
            if ctype == "numerical":
                if num_strategy == "mean":
                    fill_val = df[col].mean()
                elif num_strategy == "median":
                    fill_val = df[col].median()
                else:
                    fill_val = 0
                df[col] = df[col].fillna(fill_val)
                
            elif ctype == "categorical":
                if cat_strategy == "mode" and not df[col].mode().empty:
                    fill_val = df[col].mode()[0]
                else:
                    fill_val = "Missing"
                df[col] = df[col].fillna(fill_val)
                
            elif ctype == "text":
                df[col] = df[col].fillna("")
                
        return df

    def _handle_outliers(self, df: pd.DataFrame, cols: List[str]) -> pd.DataFrame:
        method = self.config["outliers"].get("method", "iqr")
        action = self.config["outliers"].get("action", "cap")
        
        if method == "isolation_forest":
            iso = IsolationForest(contamination=0.05, random_state=42)
            # Impute temporarily before IF if there are stragglers
            X = df[cols].fillna(df[cols].median())
            preds = iso.fit_predict(X)
            if action == "drop":
                return df[preds == 1].reset_index(drop=True)
            else:
                # Capping with Isolation Forest is ambiguous, convert to drop or ignore
                pass 
            return df
            
        for col in cols:
            if method == "zscore":
                threshold = self.config["outliers"].get("zscore_threshold", 3.0)
                mean = df[col].mean()
                std = df[col].std()
                if std == 0: continue
                
                z_scores = (df[col] - mean) / std
                
                if action == "drop":
                    df = df[abs(z_scores) <= threshold]
                elif action == "cap":
                    upper = mean + threshold * std
                    lower = mean - threshold * std
                    df[col] = df[col].clip(lower=lower, upper=upper)
                    
            elif method == "iqr":
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower = Q1 - 1.5 * IQR
                upper = Q3 + 1.5 * IQR
                
                if action == "drop":
                    df = df[(df[col] >= lower) & (df[col] <= upper)]
                elif action == "cap":
                    df[col] = df[col].clip(lower=lower, upper=upper)
                    
        return df.reset_index(drop=True)
