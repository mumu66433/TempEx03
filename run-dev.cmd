@echo off
setlocal
cd /d "%~dp0"
if exist "%ProgramFiles%\nodejs\node.exe" (
  set "PATH=%ProgramFiles%\nodejs;%PATH%"
  "%ProgramFiles%\nodejs\node.exe" "%~dp0dev.js" %*
) else (
  node "%~dp0dev.js" %*
)
if errorlevel 1 (
  echo.
  echo [setup] startup failed. See the error above.
  pause
)
