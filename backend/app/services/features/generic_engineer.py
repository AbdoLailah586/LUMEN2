"""
Automatic feature engineering.
Handles encoding, scaling, datetime extraction.
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, OneHotEncoder, LabelEncoder

class FeatureEngineer:
    def __init__(self, config: Dict[str, Any] = None):
        """
        config example:
        {
            "scaling": "standard", # standard, minmax, robust, none
            "encoding": "onehot", # onehot, label, frequency
            "datetime_extraction": ["year", "month", "day", "dayofweek"],
            "text_features": ["length", "word_count"]
        }
        """
        self.config = config or self._default_config()
        self.scalers = {}
        self.encoders = {}

    def _default_config(self) -> Dict[str, Any]:
        return {
            "scaling": "standard",
            "encoding": "onehot",
            "datetime_extraction": ["year", "month", "day", "dayofweek", "hour"],
            "text_features": ["length", "word_count"]
        }

    def transform(self, df: pd.DataFrame, column_types: Dict[str, str], is_train: bool = True) -> pd.DataFrame:
        """Applies configured feature transformations."""
        X = df.copy()
        
        # 1. Process DateTimes
        dt_cols = [col for col, ctype in column_types.items() if ctype == "datetime"]
        for col in dt_cols:
            X = self._extract_datetime_features(X, col)
            X = X.drop(columns=[col]) # Drop original target
            
        # 2. Process Text
        text_cols = [col for col, ctype in column_types.items() if ctype == "text"]
        for col in text_cols:
            X = self._extract_text_features(X, col)
            X = X.drop(columns=[col])
            
        # 3. Process Categorical (Encoding)
        cat_cols = [col for col, ctype in column_types.items() if ctype == "categorical"]
        if cat_cols:
            X = self._encode_categorical(X, cat_cols, is_train)
            
        # 4. Process Numerical (Scaling)
        # Re-evaluate numerical columns after datetime/text extraction 
        # (extracted features are numerical)
        current_numeric = X.select_dtypes(include=[np.number]).columns.tolist()
        # Do not scale ID or Target
        ignore_cols = [col for col, ctype in column_types.items() if ctype in ("id", "target")]
        num_cols = [c for c in current_numeric if c not in ignore_cols and c not in self.encoders.keys() and "_encoded_" not in c]
        
        if num_cols and self.config["scaling"] != "none":
            X = self._scale_numerical(X, num_cols, is_train)
            
        return X

    def _extract_datetime_features(self, df: pd.DataFrame, col: str) -> pd.DataFrame:
        extractions = self.config.get("datetime_extraction", [])
        if "year" in extractions: df[f"{col}_year"] = df[col].dt.year
        if "month" in extractions: df[f"{col}_month"] = df[col].dt.month
        if "day" in extractions: df[f"{col}_day"] = df[col].dt.day
        if "dayofweek" in extractions: df[f"{col}_dayofweek"] = df[col].dt.dayofweek
        if "hour" in extractions: df[f"{col}_hour"] = df[col].dt.hour
        return df

    def _extract_text_features(self, df: pd.DataFrame, col: str) -> pd.DataFrame:
        features = self.config.get("text_features", [])
        df[col] = df[col].fillna("")
        if "length" in features:
            df[f"{col}_len"] = df[col].astype(str).apply(len)
        if "word_count" in features:
            df[f"{col}_wc"] = df[col].astype(str).apply(lambda x: len(x.split()))
        return df

    def _encode_categorical(self, df: pd.DataFrame, cols: List[str], is_train: bool) -> pd.DataFrame:
        strategy = self.config.get("encoding", "onehot")
        
        if strategy == "onehot":
            if is_train:
                self.encoders['onehot'] = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
                encoded = self.encoders['onehot'].fit_transform(df[cols].astype(str))
            else:
                encoded = self.encoders['onehot'].transform(df[cols].astype(str))
                
            feature_names = self.encoders['onehot'].get_feature_names_out(cols)
            df_encoded = pd.DataFrame(encoded, columns=feature_names, index=df.index)
            df = pd.concat([df.drop(columns=cols), df_encoded], axis=1)
            
        elif strategy == "label":
            for col in cols:
                if is_train:
                    le = LabelEncoder()
                    df[col] = le.fit_transform(df[col].astype(str))
                    self.encoders[f'label_{col}'] = le
                else:
                    le = self.encoders[f'label_{col}']
                    # Handle unseen labels by assigning to unknown class (usually 0 or -1, but simple workaround below)
                    known_classes = set(le.classes_)
                    df[col] = df[col].astype(str).apply(lambda x: x if x in known_classes else le.classes_[0])
                    df[col] = le.transform(df[col])
                    
        elif strategy == "frequency":
            for col in cols:
                if is_train:
                    freq = df[col].value_counts(normalize=True).to_dict()
                    self.encoders[f'freq_{col}'] = freq
                else:
                    freq = self.encoders[f'freq_{col}']
                    
                df[col] = df[col].map(freq).fillna(0)
                
        return df

    def _scale_numerical(self, df: pd.DataFrame, cols: List[str], is_train: bool) -> pd.DataFrame:
        strategy = self.config.get("scaling", "standard")
        
        if is_train:
            if strategy == "standard":
                self.scalers['main'] = StandardScaler()
            elif strategy == "minmax":
                self.scalers['main'] = MinMaxScaler()
            elif strategy == "robust":
                self.scalers['main'] = RobustScaler()
                
            df[cols] = self.scalers['main'].fit_transform(df[cols])
        else:
            if 'main' in self.scalers:
                df[cols] = self.scalers['main'].transform(df[cols])
                
        return df
