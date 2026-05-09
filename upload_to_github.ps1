# ============================================
# LUMEN - GitHub Upload Script
# ============================================
# This script:
#   1. Removes cached files that should be ignored
#   2. Adds all source files (respecting .gitignore)
#   3. Commits and pushes to GitHub
# ============================================

param(
    [string]$CommitMessage = "Update LUMEN project"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Colors for output
function Write-Step   { param($msg) Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-OK     { param($msg) Write-Host "   [OK] $msg" -ForegroundColor Green }
function Write-Warn   { param($msg) Write-Host "   [!]  $msg" -ForegroundColor Yellow }
function Write-Err    { param($msg) Write-Host "   [X]  $msg" -ForegroundColor Red }

# ---------- 0. Ensure we're in the project root ----------
$projectRoot = $PSScriptRoot
if (-not $projectRoot) { $projectRoot = Get-Location }
Set-Location $projectRoot
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "  LUMEN - GitHub Upload Script" -ForegroundColor Magenta
Write-Host "  Project: $projectRoot" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta

# ---------- 1. Verify git is initialized ----------
Write-Step "Checking Git repository..."
if (-not (Test-Path ".git")) {
    Write-Err "No .git directory found. Initializing..."
    git init
    git remote add origin https://github.com/AbdoLailah586/LUMEN2.git
    Write-OK "Initialized new repo with remote origin"
} else {
    $remote = git remote get-url origin 2>$null
    Write-OK "Git repo found  ->  remote: $remote"
}

# ---------- 2. Verify .gitignore exists ----------
Write-Step "Checking .gitignore..."
if (-not (Test-Path ".gitignore")) {
    Write-Err ".gitignore not found! Please create one first."
    exit 1
}
Write-OK ".gitignore found"

# ---------- 3. Remove tracked files that should now be ignored ----------
Write-Step "Cleaning tracked files that should be ignored..."

# List of patterns to un-track (files already committed but now in .gitignore)
$patternsToRemove = @(
    "frontend/dist/",
    ".env",
    ".env.production",
    "folder_structure.txt",
    "dummy_dataset.csv",
    "backend_error_log.txt",
    "backend_logs.txt",
    "backend_logs2.txt",
    "backend/lumen.db",
    "backend/run_app_output.txt",
    "backend/server_logs.txt",
    "backend/uvicorn_logs.txt",
    "backend/uvicorn_output.txt",
    "backend/uvicorn_output2.txt",
    "backend/package-lock.json",
    "backend/final_predictions.csv",
    "backend/temp_*.csv",
    "backend/check_db.py",
    "backend/check_db_utf8.py",
    "backend/check_job.py",
    "backend/check_job_results.py",
    "backend/inspect_schema.py",
    "backend/list_datasets.py",
    "backend/list_users.py",
    "backend/reproduce_auth_issue.py",
    "backend/reproduce_read_issue.py",
    "backend/test_api.py",
    "backend/test_bcrypt.py",
    "backend/test_gemini.py",
    "backend/run_app.py",
    "iris_visualizations.py",
    "scaffold_lumen_system.py"
)

$removedCount = 0
foreach ($pattern in $patternsToRemove) {
    # Check if any matching files are tracked
    $tracked = git ls-files $pattern 2>$null
    if ($tracked) {
        git rm -r --cached $pattern 2>$null | Out-Null
        $removedCount++
        Write-OK "Un-tracked: $pattern"
    }
}

if ($removedCount -eq 0) {
    Write-OK "No files needed un-tracking"
} else {
    Write-OK "Removed $removedCount pattern(s) from tracking"
}

# ---------- 4. Full cache reset to ensure .gitignore is fully respected ----------
Write-Step "Resetting index to respect .gitignore fully..."
git rm -r --cached . 2>$null | Out-Null
git add .
Write-OK "Index rebuilt from .gitignore"

# ---------- 5. Show what will be committed ----------
Write-Step "Files staged for commit:"
$stagedFiles = git diff --cached --name-status
if ($stagedFiles) {
    $stagedFiles | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
} else {
    Write-Warn "No changes detected. Everything is up to date."
    exit 0
}

# ---------- 6. Confirm with user ----------
Write-Host ""
$confirm = Read-Host "Proceed with commit and push? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Warn "Aborted by user."
    exit 0
}

# ---------- 7. Commit ----------
Write-Step "Committing..."
git commit -m $CommitMessage
Write-OK "Committed: '$CommitMessage'"

# ---------- 8. Push ----------
Write-Step "Pushing to GitHub..."
$branch = git rev-parse --abbrev-ref HEAD
git push -u origin $branch
Write-OK "Pushed to origin/$branch"

# ---------- Done ----------
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Upload complete!" -ForegroundColor Green
Write-Host "  Branch: $branch" -ForegroundColor Green
Write-Host "  Remote: $(git remote get-url origin)" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
