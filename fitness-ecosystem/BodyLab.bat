@echo off
setlocal
title BodyLab

rem ============================================================================
rem  BodyLab launcher — desktop app (production build)
rem
rem  Launches the built binary directly: no console window, no dev server.
rem  Rebuild the binary first with "BodyLab Dev.bat" > option 3.
rem ============================================================================

set "EXE=%~dp0bodylab\apps\desktop\src-tauri\target\release\bodylab.exe"

if not exist "%EXE%" (
  echo.
  echo  [X] BodyLab desktop is not built yet.
  echo      Expected: %EXE%
  echo      Run "BodyLab Dev.bat" and choose option 3 to build it.
  echo.
  pause
  exit /b 1
)

start "" "%EXE%"
exit /b 0
