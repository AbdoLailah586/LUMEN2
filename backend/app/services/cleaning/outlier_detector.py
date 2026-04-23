import pandas as pd
import numpy as np

class OutlierDetector:
    def detect_and_handle(self, df: pd.DataFrame, method: str = "zscore", threshold: float = 3.0, action: str = "clip") -> pd.DataFrame:
        result = df.copy()
        numeric_cols = result.select_dtypes(include=['number']).columns
        
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
