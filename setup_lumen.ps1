# LUMEN Setup Script for Windows
$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   LUMEN One-Click Setup (Windows)        " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Phase 1: Environment Configuration
Write-Host "`n[Phase 1] Environment Configuration..." -ForegroundColor Yellow

if (-not (Test-Path ".env")) {
    Write-Host "Creating .env from .env.example..."
    Copy-Item ".env.example" ".env"
}

# Detect Docker status for DATABASE_URL
$isDockerRunning = $false
try {
    docker info >$null 2>&1
    if ($LASTEXITCODE -eq 0) { $isDockerRunning = $true }
} catch {
    $isDockerRunning = $false
}

$dbHost = if ($isDockerRunning) { "postgres" } else { "localhost" }
Write-Host "Detected Docker status: $(if($isDockerRunning){'Running'}else{'Not Running'})"
Write-Host "Setting DB host to: $dbHost"

# Update DATABASE_URL in .env
$envContent = Get-Content ".env"
$newEnvContent = $envContent -replace 'DATABASE_URL=postgresql(\+asyncpg)?://[^@]+@[^:]+:', "DATABASE_URL=postgresql+asyncpg://lumen_user:lumen_password@${dbHost}:"
$newEnvContent | Set-Content ".env"

# Phase 2: Infrastructure (Docker)
Write-Host "`n[Phase 2] Infrastructure Setup..." -ForegroundColor Yellow

# Check if docker is installed
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker not found! Please download and install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
}

# Check if Docker is running, if not try to start it
if (-not $isDockerRunning) {
    Write-Host "Docker Desktop is not running. Attempting to start it..."
    $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Start-Process $dockerPath
        Write-Host "Starting Docker Desktop... Please wait."
        # Poll until running or 60s timeout
        $timeout = 60
        while ($timeout -gt 0) {
            Start-Sleep -Seconds 5
            try {
                docker info >$null 2>&1
                if ($LASTEXITCODE -eq 0) { break }
            } catch {}
            $timeout -= 5
            Write-Host "Waiting for Docker... ($timeout seconds left)"
        }
    } else {
        Write-Error "Docker Desktop path not found. Please start it manually and run setup again."
        exit 1
    }
}

# Run infrastructure containers
Write-Host "Starting PostgreSQL and Redis containers..."
docker-compose up -d postgres redis

# Wait for healthy status
Write-Host "Waiting for containers to be healthy (max 60s)..."
$timeout = 60
while ($timeout -gt 0) {
    $status = docker-compose ps --format json | ConvertFrom-Json
    $allHealthy = $true
    foreach ($svc in $status) {
        if ($svc.Service -eq "postgres" -or $svc.Service -eq "redis") {
            if ($svc.HealthStatus -ne "healthy" -and $svc.State -ne "running") { # Some versions don't show health status immediately
                $allHealthy = $false
            }
        }
    }
    if ($allHealthy) { break }
    Start-Sleep -Seconds 5
    $timeout -= 5
    Write-Host "Polling health... ($timeout seconds left)"
}

docker-compose ps

# Phase 3: Backend Setup
Write-Host "`n[Phase 3] Backend Setup..." -ForegroundColor Yellow
Set-Location "backend"

if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..."
    python -m venv venv
}

Write-Host "Activating venv and installing dependencies..."
& ".\venv\Scripts\Activate.ps1"
python -m pip install --upgrade pip
python -m pip install -r requirements.txt --no-cache-dir

Write-Host "Running database migrations..."
alembic upgrade head

Write-Host "Creating test user..."
python create_admin.py

Set-Location ".."

# Phase 4: Frontend Setup
Write-Host "`n[Phase 4] Frontend Setup..." -ForegroundColor Yellow

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js not found! Please download and install Node.js: https://nodejs.org/"
    exit 1
}

Set-Location "frontend"
Write-Host "Installing npm dependencies..."
npm install
Write-Host "Building frontend..."
npm run build
Set-Location ".."

# Phase 5: Completion
Write-Host "`n[Phase 5] Completion" -ForegroundColor Green
Write-Host "Setup finished successfully!"

$choice = Read-Host "Do you want to start the services now? (Y/N)"
if ($choice -eq 'Y' -or $choice -eq 'y') {
    Write-Host "Starting services..."
    # Launch backend and frontend in new windows
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
    Write-Host "Services started. Check the new terminal windows."
}

Write-Host "`nPress any key to exit..."
[void][System.Console]::ReadKey($true)
