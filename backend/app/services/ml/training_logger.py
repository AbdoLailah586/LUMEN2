from datetime import datetime, timezone
from typing import Optional


def append_training_log(
    db,
    job,
    message: str,
    log_type: str = "info",
    code: Optional[str] = None,
    step: Optional[str] = None,
) -> None:
    results = dict(job.results or {})
    logs = list(results.get("training_log", []))
    logs.append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": log_type,
        "message": message,
        "code": code,
    })
    results["training_log"] = logs
    if step:
        results["current_step"] = step
    job.results = results
    db.commit()
