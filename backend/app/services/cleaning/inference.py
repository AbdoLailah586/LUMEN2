import pandas as pd
import numpy as np

class ColumnTypeInference:
    """
    Infers the role and semantic type of DataFrame columns to facilitate
    generic, automated feature engineering.
    """
    def __init__(self, df: pd.DataFrame, target_col: str = None):
        self.df = df
        self.target_col = target_col
        self.num_rows = len(df)
        
    def infer_types(self) -> dict:
        """Returns a dictionary mapping column names to their inferred generic type."""
        inferred = {
            'numerical': [],
            'categorical_low': [],  # < 20 unique
            'categorical_high': [], # >= 20 unique, non-text
            'text': [],
            'datetime': [],
            'id': [],
            'target': []
        }
        
        for col in self.df.columns:
            if self.target_col and col == self.target_col:
                inferred['target'].append(col)
                continue
                
            unique_count = self.df[col].nunique()
            col_dtype = self.df[col].dtype
            
            # Check for ID (high cardinality, high uniqueness ratio > 0.95, and typical name)
            is_high_uniqueness = (unique_count / self.num_rows) > 0.95 if self.num_rows > 0 else False
            looks_like_id = col.lower().endswith('id') or col.lower() in ['index', 'uuid', 'guid']
            
            if is_high_uniqueness and looks_like_id:
                inferred['id'].append(col)
                continue
            elif col_dtype == 'object' and is_high_uniqueness and self.num_rows > 100:
                inferred['id'].append(col)
                continue

            # Check for Datetime
            if pd.api.types.is_datetime64_any_dtype(self.df[col]):
                inferred['datetime'].append(col)
                continue
            if col_dtype == 'object':
                try:
                    # Quick sampling to see if it parses to datetime
                    sample = self.df[col].dropna().head(10)
                    if not sample.empty:
                        # Attempt to parse
                        pd.to_datetime(sample, errors='raise')
                        # If successful, assume whole column is datetime
                        inferred['datetime'].append(col)
                        continue
                except:
                    pass
            
            # Check for Numeric vs Categorical
            if pd.api.types.is_numeric_dtype(self.df[col]):
                # If numeric but very few unique values, might be categorical
                if unique_count < 20 and unique_count < (self.num_rows * 0.1):
                    inferred['categorical_low'].append(col)
                else:
                    inferred['numerical'].append(col)
            else:
                # Object/Text/Category
                if unique_count < 20:
                    inferred['categorical_low'].append(col)
                elif unique_count < 100:
                    inferred['categorical_high'].append(col)
                else:
                    inferred['text'].append(col)
                    
        return inferred
