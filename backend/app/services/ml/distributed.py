import os
import pandas as pd

# Fallback memory limit size for checking chunk usage. 
# Datasets > 500MB will trigger Distributed strategies
MEMORY_LIMIT_BYTES = int(os.getenv("MEMORY_LIMIT_BYTES", 500 * 1024 * 1024))

class DataProcessorFactory:
    @staticmethod
    def load_data(file_path: str, file_type: str, file_size: int):
        """
        Dynamically returns either an In-memory Pandas Dataframe or a Dask computing instance 
        for very large files.
        """
        if file_size < MEMORY_LIMIT_BYTES:
            return InMemoryProcessor().load(file_path, file_type)
        else:
            return DistributedProcessor().load(file_path, file_type)

class InMemoryProcessor:
    def load(self, file_path: str, file_type: str):
        if file_type == 'csv':
            return pd.read_csv(file_path)
        elif file_type in ['xls', 'xlsx']:
            return pd.read_excel(file_path)
        elif file_type == 'json':
            return pd.read_json(file_path)
        elif file_type == 'parquet':
            return pd.read_parquet(file_path)
        elif file_type == 'xml':
            return pd.read_xml(file_path)
        elif file_type in ['sqlite', 'db', 'sqlite3']:
            import sqlite3
            conn = sqlite3.connect(file_path)
            query = "SELECT name FROM sqlite_master WHERE type='table';"
            tables = pd.read_sql_query(query, conn)
            if not tables.empty:
                first_table = tables.iloc[0]['name']
                df = pd.read_sql_query(f"SELECT * FROM {first_table}", conn)
            else:
                df = pd.DataFrame()
            conn.close()
            return df
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

class DistributedProcessor:
    def load(self, file_path: str, file_type: str):
        """
        Loads large datasets using Dask. Returns a Dask DataFrame to be lazily computed.
        """
        import dask.dataframe as dd
        
        if file_type == 'csv':
            return dd.read_csv(file_path, blocksize='25MB')
        elif file_type == 'parquet':
            return dd.read_parquet(file_path)
        else:
            # Fallback to chunked pandas reading for formats unsupported seamlessly by Dask
            # but wrapping it in Dask
            # For brevity in AutoML prototype, returning chunked iterator
            if file_type == 'json':
                return pd.read_json(file_path, lines=True, chunksize=10000)
            else:
                raise ValueError(f"Large File Distributed processing currently only supports CSV/Parquet. For {file_type}, please provide a dataset < 500MB")
