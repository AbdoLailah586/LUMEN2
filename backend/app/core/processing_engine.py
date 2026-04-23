"""
Determine usage of Pandas vs Dask vs Spark based on file size constraints.
"""
import os
from typing import Dict, Any, Tuple
import pandas as pd

class ProcessingEngineDispatcher:
    def __init__(self, pandas_limit_mb: float = 1000.0, dask_limit_mb: float = 50000.0):
        self.pandas_limit_mb = pandas_limit_mb
        self.dask_limit_mb = dask_limit_mb
        
    def _get_file_size_mb(self, file_path: str) -> float:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Dataset file not found: {file_path}")
        return os.path.getsize(file_path) / (1024 * 1024)

    def determine_engine(self, file_path: str) -> str:
        """Determines the optimal processing engine based on file size."""
        size_mb = self._get_file_size_mb(file_path)
        
        if size_mb <= self.pandas_limit_mb:
            return "pandas"
        elif size_mb <= self.dask_limit_mb:
            return "dask"
        else:
            return "spark"

    def load_data(self, file_path: str, force_engine: str = None) -> Any:
        """Loads data using the appropriate or forced engine."""
        engine = force_engine or self.determine_engine(file_path)
        
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if engine == "pandas":
            if file_ext == '.csv':
                return pd.read_csv(file_path)
            elif file_ext in ['.xls', '.xlsx']:
                return pd.read_excel(file_path)
            elif file_ext == '.json':
                return pd.read_json(file_path)
            elif file_ext == '.parquet':
                return pd.read_parquet(file_path)
            else:
                raise ValueError(f"Unsupported file type for pandas: {file_ext}")
                
        elif engine == "dask":
            try:
                import dask.dataframe as dd
            except ImportError:
                raise ImportError("Dask is required to process files of this size. Please install it.")
                
            if file_ext == '.csv':
                return dd.read_csv(file_path)
            elif file_ext == '.parquet':
                return dd.read_parquet(file_path)
            else:
                raise ValueError(f"Dask engine only supports CSV/Parquet natively in LUMEN. Ext: {file_ext}")
                
        elif engine == "spark":
            try:
                from pyspark.sql import SparkSession
            except ImportError:
                raise ImportError("PySpark is required to process files of this size. Please install it.")
                
            spark = SparkSession.builder.appName("LUMEN_Spark").getOrCreate()
            
            if file_ext == '.csv':
                return spark.read.csv(file_path, header=True, inferSchema=True)
            elif file_ext == '.parquet':
                return spark.read.parquet(file_path)
            else:
                 raise ValueError("Spark engine only supports CSV/Parquet in LUMEN.")
                 
        else:
            raise ValueError(f"Unknown engine: {engine}")
