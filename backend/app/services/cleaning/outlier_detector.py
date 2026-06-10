import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest

class OutlierDetector:
    def detect_and_handle(self, df: pd.DataFrame, method: str = "zscore", threshold: float = 3.0, action: str = "clip") -> pd.DataFrame:
        result = df.copy()
        numeric_cols = result.select_dtypes(include=['number']).columns

        if method == "isolation_forest":
            if len(numeric_cols) == 0:
                return result
            X = result[numeric_cols].fillna(result[numeric_cols].median())
            iso = IsolationForest(contamination=0.05, random_state=42)
            preds = iso.fit_predict(X)
            outliers = preds == -1
            if action == "drop":
                return result.loc[~outliers].reset_index(drop=True)
            for col in numeric_cols:
                Q1 = result[col].quantile(0.25)
                Q3 = result[col].quantile(0.75)
                IQR = Q3 - Q1
                lower = Q1 - 1.5 * IQR
                upper = Q3 + 1.5 * IQR
                result.loc[outliers, col] = result.loc[outliers, col].clip(lower=lower, upper=upper)
            return result
        
        for col in numeric_cols:
            active_method = method
            if method == "auto":
                skew = result[col].skew()
                if pd.notna(skew) and abs(skew) > 1:
                    active_method = "iqr"
                else:
                    active_method = "zscore"

            if active_method == "zscore":
                mean = result[col].mean()
                std = result[col].std()
                if std > 0:
                    z_scores = (result[col] - mean) / std
                    outliers = np.abs(z_scores) > threshold
                else:
                    outliers = pd.Series(False, index=result.index)
            elif active_method == "iqr":
                Q1 = result[col].quantile(0.25)
                Q3 = result[col].quantile(0.75)
                IQR = Q3 - Q1
                outliers = (result[col] < (Q1 - 1.5 * IQR)) | (result[col] > (Q3 + 1.5 * IQR))
            else:
                continue
                
            if action == "drop":
                result = result.loc[~outliers]
            elif action == "clip":
                if active_method == "zscore":
                    lower = mean - threshold * std
                    upper = mean + threshold * std
                else: # iqr
                    lower = Q1 - 1.5 * IQR
                    upper = Q3 + 1.5 * IQR
                result[col] = np.clip(result[col], lower, upper)
                
        return result
