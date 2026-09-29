@echo off
setlocal
title BodyLab + TrainingLab - LAN server (phone testing)

rem ============================================================================
rem  One-click LAN server — open both apps on a phone over the local network.
rem
rem  Builds both web bundles (relocatable, `--base=./`) and serves them from a
rem  single port behind a small hub page. The terminal prints the
rem  http://<LAN-IP>:8090/ URL to type on the iPhone. Closing this window (or
rem  Ctrl+C) stops the server.
rem
rem  Everything is offline and local: no account, no upload, no telemetry. Each
rem  device keeps its own data in its own browser storage.
rem
rem  Flags (all optional):
rem    --port 8090     change the port
rem    --build         force a rebuild of both apps first
rem    --no-build      never build (fail if a bundle is missing)
rem ============================================================================

cd /d "%~dp0"

where node >nul 2>&1 || (
  echo.
  echo  [X] Node.js is not in PATH. Install Node 20 or newer first.
  echo.
  pause
  exit /b 1
)

node scripts\serve-lan.mjs %*

echo.
pause
