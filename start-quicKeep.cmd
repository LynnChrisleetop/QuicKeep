@echo off
setlocal
set "ROOT=%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 18 or newer was not found.
  echo Install it from https://nodejs.org/
  pause
  exit /b 1
)

echo Starting QuicKeep bridge...
echo Keep this window open. Close it to stop the bridge.
node "%ROOT%bridge\server.mjs"
pause