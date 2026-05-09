# Script to run LUMEN Celery Worker locally on Windows
Write-Host "Starting LUMEN Celery Worker..." -ForegroundColor Cyan
Set-Location "backend"
if (Test-Path "venv\Scripts\Activate.ps1") {
    & ".\venv\Scripts\Activate.ps1"
    celery -A app.core.celery_app worker --loglevel=info -P eventlet -Q celery,ml,rl,gnn,cleaning,cv
} else {
    Write-Error "Virtual environment not found! Please run setup_lumen.ps1 first."
}
