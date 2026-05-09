import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, RobustScaler

class GenericFeatureEngineer:
    """
    Applies generic transformations dynamically based on inferred column types.
    """
    def __init__(self, inferred_types: dict):
        self.types = inferred_types
        # Encoders and scalers can be saved if needed for inference time
    
    def apply_transformations(self, df: pd.DataFrame) -> pd.DataFrame:
        df_out = df.copy()
        
        # 1. Drop IDs and Text (for standard tabular ML, text requires embeddings, which is outside basic AutoML scope for now)
        cols_to_drop = self.types.get('id', []) + self.types.get('text', [])
        df_out = df_out.drop(columns=[c for c in cols_to_drop if c in df_out.columns], errors='ignore')
        
        # 2. Extract Datetime features
        for dt_col in self.types.get('datetime', []):
            if dt_col in df_out.columns:
                try:
                    df_out[dt_col] = pd.to_datetime(df_out[dt_col], errors='coerce')
                    df_out[f'{dt_col}_year'] = df_out[dt_col].dt.year
                    df_out[f'{dt_col}_month'] = df_out[dt_col].dt.month
                    df_out[f'{dt_col}_day'] = df_out[dt_col].dt.day
                    df_out[f'{dt_col}_dayofweek'] = df_out[dt_col].dt.dayofweek
                    df_out = df_out.drop(columns=[dt_col])
                except Exception as e:
                    df_out = df_out.drop(columns=[dt_col]) # Drop if conversion fails
        
        # 3. Handle Numerical Missing & Scaling
        for num_col in self.types.get('numerical', []):
            if num_col in df_out.columns:
                # Missing value imputation: median
                df_out[num_col] = df_out[num_col].fillna(df_out[num_col].median())
                
        # (Scaling usually done in pipeline, but we can do it here for the processed dataset representation)
        
        # 4. Handle Categorical Low Cardinality (One-Hot) & Imputation
        for cat_col in self.types.get('categorical_low', []):
            if cat_col in df_out.columns:
                mode_val = df_out[cat_col].mode()
                fill_val = mode_val[0] if not mode_val.empty else 'Unknown'
                df_out[cat_col] = df_out[cat_col].fillna(fill_val)
                # Dummies
                dummies = pd.get_dummies(df_out[cat_col], prefix=cat_col, drop_first=True)
                df_out = pd.concat([df_out, dummies], axis=1)
                df_out = df_out.drop(columns=[cat_col])
                
        # 5. Handle Categorical High Cardinality (Frequency Encoding)
        for cat_col in self.types.get('categorical_high', []):
            if cat_col in df_out.columns:
                mode_val = df_out[cat_col].mode()
                fill_val = mode_val[0] if not mode_val.empty else 'Unknown'
                df_out[cat_col] = df_out[cat_col].fillna(fill_val)
                
                # Frequency encoding
                freq = df_out[cat_col].value_counts()
                df_out[f'{cat_col}_freq'] = df_out[cat_col].map(freq)
                df_out = df_out.drop(columns=[cat_col])
                
        return df_out

    def detect_outliers(self, df: pd.DataFrame, method='iqr') -> pd.DataFrame:
        """
        Generic outlier detection and clipping (IQR over numerical columns)
        """
        df_out = df.copy()
        
        for num_col in self.types.get('numerical', []):
            if num_col in df_out.columns:
                if method == 'iqr':
                    Q1 = df_out[num_col].quantile(0.25)
                    Q3 = df_out[num_col].quantile(0.75)
                    IQR = Q3 - Q1
                    lower = Q1 - 1.5 * IQR
                    upper = Q3 + 1.5 * IQR
                    df_out[num_col] = df_out[num_col].clip(lower=lower, upper=upper)
                elif method == 'zscore':
                    mean = df_out[num_col].mean()
                    std = df_out[num_col].std()
                    df_out[num_col] = df_out[num_col].clip(lower=mean - 3*std, upper=mean + 3*std)
                    
        return df_out
