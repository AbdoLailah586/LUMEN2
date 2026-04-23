"""
Automatic column type detection without hardcoded names.
Uses statistical heuristics + optional LLM fallback.
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional
import os

class ColumnTypeInferencer:
    """
    Infers the types of columns in a pandas DataFrame based on statistical heuristics.
    Categorizes columns into: 'numerical', 'categorical', 'datetime', 'text', 'id', 'target'.
    """
    
    def __init__(self, use_llm_fallback: bool = False, categorical_cardinality_threshold: float = 0.05):
        self.use_llm_fallback = use_llm_fallback
        self.categorical_threshold = categorical_cardinality_threshold # % of unique values to be considered categorical

    def infer_types(self, df: pd.DataFrame, target_column: Optional[str] = None) -> Dict[str, str]:
        """
        Detects if columns are numerical, categorical, datetime, text, id, or target.
        """
        types = {}
        row_count = len(df)
        
        for col in df.columns:
            if target_column and col == target_column:
                types[col] = "target"
                continue
                
            unique_count = df[col].nunique()
            null_count = df[col].isnull().sum()
            non_null_count = row_count - null_count
            
            # 1. Check for ID column
            # If every value is unique and it's mostly non-null, it's likely an ID
            if unique_count == non_null_count and non_null_count > 0:
                types[col] = "id"
                continue

            # 2. Check for DateTime
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                types[col] = "datetime"
                continue
                
            # Attempt to convert object columns to datetime if they look like dates
            if df[col].dtype == 'object':
                try:
                    # Sample first valid index to avoid massive parsing overhead if it fails fast
                    if non_null_count > 0:
                        first_valid = df[col].dropna().iloc[0]
                        # VERY basic string check to prevent trying to parse entire huge text corpora
                        if isinstance(first_valid, str) and any(c.isdigit() for c in first_valid) and len(first_valid) < 50:
                            parsed_col = pd.to_datetime(df[col][:100], errors='coerce')
                            if parsed_col.notnull().sum() > len(parsed_col) * 0.8: # 80% success
                                df[col] = pd.to_datetime(df[col], errors='coerce')
                                types[col] = "datetime"
                                continue
                except Exception:
                    pass

            # 3. Check for Numerical
            if pd.api.types.is_numeric_dtype(df[col]):
                # Integers with very low cardinality might actually be categorical (e.g. 0,1,2 classes)
                if unique_count < 15 and pd.api.types.is_integer_dtype(df[col]):
                    types[col] = "categorical"
                else:
                    types[col] = "numerical"
                continue

            # 4. Check for Categorical vs Text
            if df[col].dtype == 'object' or df[col].dtype == 'category':
                # Calculate cardinality ratio
                if non_null_count > 0:
                    cardinality_ratio = unique_count / non_null_count
                else:
                    cardinality_ratio = 1.0
                
                # If ratio is low, or absolute unique count is small (<100), it's categorical
                if cardinality_ratio <= self.categorical_threshold or unique_count < 100:
                    types[col] = "categorical"
                else:
                    # High cardinality strings are likely raw text
                    types[col] = "text"
                continue
                
            # Fallback
            types[col] = "unknown"

        # Optional LLM fallback for 'unknown' or 'text' vs 'categorical' edge cases
        if self.use_llm_fallback:
            types = self._llm_refine_types(df, types)

        return types
        
    def _llm_refine_types(self, df: pd.DataFrame, current_types: Dict[str, str]) -> Dict[str, str]:
        """Uses LLM API to refine ambiguous types using column names and samples."""
        # Integration point for the LLM Agent Module
        # In production this would call out to backend.app.services.llm.agent
        print("LLM Refinement skipped: Mock implementation")
        return current_types
