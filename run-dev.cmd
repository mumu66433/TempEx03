@echo off
setlocal
cd /d "%~dp0"
node "%~dp0dev.js" %*
if errorlevel 1 (
  echo.
  echo [setup] startup failed. See the error above.
  pause
)
