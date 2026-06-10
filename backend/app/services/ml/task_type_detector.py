import pandas as pd


def detect_task_type(y: pd.Series, configured: str | None = None) -> tuple[str, str]:
    """
    Infer classification vs regression from the target column.
    Returns (task_type, reason).
    """
    if configured and configured in ("classification", "regression") and not _should_override(configured, y):
        return configured, "using configured task type"

    if pd.api.types.is_bool_dtype(y) or str(y.dtype) == "boolean":
        return "classification", "boolean target column"

    if not pd.api.types.is_numeric_dtype(y):
        return "classification", "non-numeric target column"

    n_unique = int(y.nunique(dropna=True))
    if n_unique <= 10:
        return "classification", f"numeric target with {n_unique} unique values (<=10)"

    return "regression", f"continuous numeric target ({n_unique} unique values)"


def _should_override(configured: str, y: pd.Series) -> bool:
    """Override misconfigured task types (e.g. regression on 3-class target)."""
    if configured == "regression" and pd.api.types.is_numeric_dtype(y):
        if y.nunique(dropna=True) <= 10:
            return True
    if configured == "classification" and pd.api.types.is_numeric_dtype(y):
        if y.nunique(dropna=True) > 20:
            return True
    return False
