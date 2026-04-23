import pandas as pd
from sklearn.impute import KNNImputer

class MissingValueHandler:
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
            elif strategy == 'constant' and fill_value is not None:
                result[col] = result[col].fillna(fill_value)
        
        # Handle advanced strategies
        if strategy == 'knn':
            numeric_cols = result.select_dtypes(include=['number']).columns
            if len(numeric_cols) > 0:
                imputer = KNNImputer(n_neighbors=5)
                # Ensure we only impute if there are missing values in numeric cols
                if result[numeric_cols].isnull().sum().sum() > 0:
                    result[numeric_cols] = imputer.fit_transform(result[numeric_cols])
                
        return result
