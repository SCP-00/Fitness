@echo off
setlocal
title TrainingLab

rem ============================================================================
rem  TrainingLab launcher — web app served locally
rem
rem  TrainingLab does not have its own Tauri shell yet, so this starts the
rem  one-button LAN server and opens TrainingLab in the default browser.
rem  The same server also exposes BodyLab at /bodylab/ for the phone.
rem
rem  First run builds both bundles (a minute or two); later runs are instant.
rem  Close this window to stop the server.
rem ============================================================================

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo  [X] Node.js was not found in PATH.
  echo      Install Node 20+ ^(https://nodejs.org^) and run this again.
  echo.
  pause
  exit /b 1
)

echo.
echo  Starting TrainingLab (local server + browser)...
echo  Press Ctrl+C or close this window to stop.
echo.

call node scripts\serve-lan.mjs --open traininglab %*
if errorlevel 1 (
  echo.
  echo  [X] The local server failed to start — see the message above.
  pause
)
exit /b 0
