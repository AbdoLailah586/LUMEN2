import pandas as pd
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder

class DataTransformer:
    def transform(self, df: pd.DataFrame, scaling_method: str = None, encoding_method: str = None) -> pd.DataFrame:
        result = df.copy()
        numeric_cols = result.select_dtypes(include=['number']).columns
        cat_cols = result.select_dtypes(include=['object', 'category']).columns
        
        if scaling_method == "standard":
            scaler = StandardScaler()
            if len(numeric_cols) > 0:
                result[numeric_cols] = scaler.fit_transform(result[numeric_cols])
        elif scaling_method == "minmax":
            scaler = MinMaxScaler()
            if len(numeric_cols) > 0:
                result[numeric_cols] = scaler.fit_transform(result[numeric_cols])
                
        if encoding_method == "label":
            for col in cat_cols:
                le = LabelEncoder()
                # Must handle NaNs as strings for LabelEncoder
                temp = result[col].astype(str)
                result[col] = le.fit_transform(temp)
        elif encoding_method == "onehot":
            if len(cat_cols) > 0:
                result = pd.get_dummies(result, columns=cat_cols, drop_first=True)
                
        return result
