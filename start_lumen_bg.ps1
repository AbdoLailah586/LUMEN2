# Start LUMEN Services
Write-Host "Starting LUMEN Backend..." -ForegroundColor Blue
Start-Process -FilePath "d:\doc\python\LUMEN\.venv_lumen\Scripts\python.exe" -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -WorkingDirectory "d:\doc\python\LUMEN\backend" -NoNewWindow

Write-Host "Starting LUMEN Celery Worker (Solo Pool)..." -ForegroundColor Green
Start-Process -FilePath "d:\doc\python\LUMEN\.venv_lumen\Scripts\python.exe" -ArgumentList "-m celery -A app.core.celery_app worker --loglevel=info -P solo -Q celery,ml,rl,gnn,cleaning,cv" -WorkingDirectory "d:\doc\python\LUMEN\backend" -NoNewWindow

Write-Host "LUMEN Services Started!" -ForegroundColor Cyan
