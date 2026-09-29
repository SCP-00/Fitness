@echo off
setlocal EnableDelayedExpansion
title BodyLab Launcher

rem ============================================================================
rem  BodyLab developer launcher
rem    1. Web dev server (browser, hot reload)
rem    2. Desktop dev (Tauri window on the Vite server — first compile ~5-10 min)
rem    3. Desktop release build (installer + bodylab.exe, then smoke test)
rem    4. Full quality pipeline (typecheck + unit + E2E)
rem ============================================================================

:menu
cls
echo.
echo  ╔══════════════════════════════════════╗
echo  ║   🏋️  BodyLab Launcher               ║
echo  ╚══════════════════════════════════════╝
echo.
echo   [1] Web dev server        (http://localhost:5173)
echo   [2] Desktop dev           (Tauri window, hot reload)
echo   [3] Desktop release build (NSIS installer + smoke test)
echo   [4] Full check            (typecheck + tests + E2E)
echo   [Q] Quit
echo.
set /p choice="  Select: "

if /i "%choice%"=="1" goto web
if /i "%choice%"=="2" goto desktop-dev
if /i "%choice%"=="3" goto desktop-build
if /i "%choice%"=="4" goto check
if /i "%choice%"=="q" exit /b 0
goto menu

:web
cd /d "%~dp0bodylab\apps\web"
echo.
echo  Starting Vite dev server on http://localhost:5173 ...
start "BodyLab Web" cmd /c "npx vite --port 5173 --host"
timeout /t 3 /nobreak > nul
start http://localhost:5173
echo  Server started in a separate window. Close it to stop.
timeout /t 3 /nobreak > nul
goto menu

:desktop-dev
cd /d "%~dp0bodylab\apps\desktop"
echo.
echo  Starting Tauri dev (opens a native window; first compile takes minutes)...
call pnpm dev
goto menu

:desktop-build
cd /d "%~dp0bodylab\apps\desktop"
echo.
echo  Building release binary + NSIS installer (this can take several minutes)...
call pnpm build
if errorlevel 1 (
  echo.
  echo  [X] Build FAILED.
  pause
  goto menu
)
echo.
echo  Running the binary smoke test...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0bodylab\apps\desktop\scripts\smoke-desktop.ps1"
echo.
echo  Installer: bodylab\apps\desktop\src-tauri\target\release\bundle\nsis\
pause
goto menu

:check
cd /d "%~dp0"
where pnpm >nul 2>&1 || (echo  [X] pnpm not found in PATH & pause & goto menu)
echo.
echo  Running pnpm check (typecheck + unit + browser E2E)...
call pnpm check
pause
goto menu
