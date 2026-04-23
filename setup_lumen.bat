@echo off
REM LUMEN One-Click Setup Launcher
REM This batch file launches the PowerShell setup script with the proper execution policy bypass.

echo Checking for administrator privileges...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running with administrator privileges.
) else (
    echo WARNING: It is recommended to run this script as an Administrator.
)

powershell -ExecutionPolicy Bypass -File "%~dp0setup_lumen.ps1"

pause
