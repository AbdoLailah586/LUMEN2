import json
import os
import sqlite3
from typing import Any, Optional

import pandas as pd

from app.models.dataset import Dataset


def load_dataset_dataframe(dataset: Dataset, nrows: Optional[int] = None) -> pd.DataFrame:
    file_path = dataset.storage_path
    file_ext = dataset.file_type
    read_kwargs = {"nrows": nrows} if nrows else {}

    if file_ext == "csv":
        return pd.read_csv(file_path, **read_kwargs)
    if file_ext in ["xls", "xlsx"]:
        return pd.read_excel(file_path, **read_kwargs)
    if file_ext == "json":
        df = pd.read_json(file_path)
        return df.head(nrows) if nrows else df
    if file_ext == "parquet":
        df = pd.read_parquet(file_path)
        return df.head(nrows) if nrows else df
    if file_ext == "xml":
        df = pd.read_xml(file_path)
        return df.head(nrows) if nrows else df
    if file_ext in ["sqlite", "db", "sqlite3"]:
        conn = sqlite3.connect(file_path)
        tables = pd.read_sql_query(
            "SELECT name FROM sqlite_master WHERE type='table';", conn
        )
        if tables.empty:
            conn.close()
            return pd.DataFrame()
        first_table = tables.iloc[0]["name"]
        limit = f" LIMIT {nrows}" if nrows else ""
        df = pd.read_sql_query(f"SELECT * FROM {first_table}{limit}", conn)
        conn.close()
        return df

    raise ValueError(f"Unsupported file extension: {file_ext}")


def build_dataset_summary(df: pd.DataFrame, sample_size: int = 8) -> dict[str, Any]:
    columns = []
    total_missing = 0
    duplicate_rows = int(df.duplicated().sum()) if len(df) > 0 else 0

    for col in df.columns:
        missing = int(df[col].isna().sum())
        total_missing += missing
        columns.append({
            "name": col,
            "type": str(df[col].dtype),
            "missing": missing,
        })

    sample_df = df.head(sample_size)
    return {
        "row_count": len(df),
        "column_count": len(df.columns),
        "total_missing": total_missing,
        "duplicate_rows": duplicate_rows,
        "columns": columns,
        "sample_rows": json.loads(
            sample_df.to_json(orient="records", date_format="iso")
        ),
    }


def compute_preview_changes(before: dict[str, Any], after: dict[str, Any]) -> dict[str, Any]:
    before_cols = {c["name"] for c in before["columns"]}
    after_cols = {c["name"] for c in after["columns"]}

    return {
        "rows_delta": after["row_count"] - before["row_count"],
        "columns_delta": after["column_count"] - before["column_count"],
        "missing_delta": after["total_missing"] - before["total_missing"],
        "duplicates_removed": before["duplicate_rows"] - after["duplicate_rows"],
        "columns_dropped": sorted(before_cols - after_cols),
        "columns_added": sorted(after_cols - before_cols),
    }
