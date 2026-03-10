@echo off
setlocal

REM Launcher for archive_model_test.ps1

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0archive_model_test.ps1"

if errorlevel 1 (
  echo.
  echo Archiving failed.
  exit /b 1
)

echo.
echo Done.
exit /b 0
