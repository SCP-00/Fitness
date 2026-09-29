# ============================================================================
#  Fitness Ecosystem — desktop shortcut installer
#
#  Creates/refreshes the Windows shortcuts for both apps on the *real* desktop
#  with the real brand icons.
#
#  Why this script exists (the bug it fixes)
#  -----------------------------------------
#  The first version created a single "BodyLab Dev.lnk" pointing at cmd.exe with
#  `IconLocation = shell32.dll,175` — i.e. a stock Windows glyph, not the app.
#  The production shortcut installed by NSIS inherited the icon embedded in
#  bodylab.exe, which was built *before* the brand artwork existed, so it also
#  looked generic.
#
#  Fixing it properly means two things this script now does:
#    1. render `resources/brand/<app>-icon.ico` (multi-size) with
#       `node scripts/render-brand-icons.mjs`; and
#    2. point every shortcut's `IconLocation` at that file explicitly, so the
#       shell never falls back to the executable's (possibly stale) resource.
#
#  Idempotent: re-run it after moving the repo or re-rendering the icons.
#
#  Usage:  powershell -NoProfile -ExecutionPolicy Bypass -File install-shortcut.ps1
# ============================================================================

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$brand = Join-Path $root 'resources\brand'

# ── Icon masters ───────────────────────────────────────────────────────────
$bodylabIco = Join-Path $brand 'bodylab-icon.ico'
$traininglabIco = Join-Path $brand 'traininglab-icon.ico'

if (-not (Test-Path $bodylabIco) -or -not (Test-Path $traininglabIco)) {
  Write-Host 'Icon files missing — rendering them from resources/brand/*.jpg ...' -ForegroundColor Yellow
  Push-Location $root
  try { node scripts/render-brand-icons.mjs } finally { Pop-Location }
}
if (-not (Test-Path $bodylabIco)) {
  throw "Could not produce $bodylabIco. Run 'node scripts/render-brand-icons.mjs' and try again."
}

# ── Desktop location ───────────────────────────────────────────────────────
# OneDrive redirects the desktop on most Windows 11 setups; the plain
# %USERPROFILE%\Desktop folder usually still exists but stays empty, which is
# how the first shortcut ended up somewhere the user never looks.
function Resolve-Desktop {
  $candidates = @()
  if ($env:OneDrive) { $candidates += (Join-Path $env:OneDrive 'Desktop') }
  $candidates += (Join-Path $env:USERPROFILE 'Desktop')
  foreach ($c in $candidates) { if (Test-Path $c) { return $c } }
  throw 'No Desktop folder found.'
}

$desktop = Resolve-Desktop
Write-Host "Desktop: $desktop" -ForegroundColor Gray
Write-Host ''

$shell = New-Object -ComObject WScript.Shell

<#
  Write one shortcut and report what it points at.

  `iconIndex` stays 0 because each .ico is a self-contained multi-size file.
#>
function New-AppShortcut {
  param(
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][string]$Target,
    [string]$Arguments = '',
    [string]$WorkingDirectory = $root,
    [Parameter(Mandatory)][string]$Icon,
    [string]$Description = ''
  )

  $path = Join-Path $desktop "$Name.lnk"
  $shortcut = $shell.CreateShortcut($path)
  $shortcut.TargetPath = $Target
  $shortcut.Arguments = $Arguments
  $shortcut.WorkingDirectory = $WorkingDirectory
  $shortcut.IconLocation = "$Icon,0"
  if ($Description) { $shortcut.Description = $Description }
  $shortcut.Save()

  Write-Host "  + $Name.lnk  ->  $Target" -ForegroundColor Green
}

Write-Host 'Installing shortcuts...' -ForegroundColor Cyan

# ── BodyLab (production) ───────────────────────────────────────────────────
# Prefer the installed binary (it survives the repo moving); fall back to the
# local release build, then to the launcher script, which explains what is
# missing instead of silently doing nothing.
$installed = Join-Path $env:LOCALAPPDATA 'BodyLab\bodylab.exe'
$localBuild = Join-Path $root 'bodylab\apps\desktop\src-tauri\target\release\bodylab.exe'

if (Test-Path $installed) {
  New-AppShortcut -Name 'BodyLab' -Target $installed -Icon $bodylabIco `
    -Description 'BodyLab — antropometría, composición corporal y modelo 3D'
} elseif (Test-Path $localBuild) {
  New-AppShortcut -Name 'BodyLab' -Target $localBuild -Icon $bodylabIco `
    -Description 'BodyLab (build local) — antropometría, composición corporal y modelo 3D'
} else {
  New-AppShortcut -Name 'BodyLab' -Target (Join-Path $root 'BodyLab.bat') -Icon $bodylabIco `
    -Description 'BodyLab — compila el escritorio con BodyLab Dev.bat (opción 3)'
}

# ── BodyLab (development menu) ─────────────────────────────────────────────
New-AppShortcut -Name 'BodyLab Dev' `
  -Target (Join-Path $root 'BodyLab Dev.bat') `
  -Icon $bodylabIco `
  -Description 'BodyLab — menú de desarrollo (web, escritorio, build, tests)'

# ── TrainingLab ────────────────────────────────────────────────────────────
# TrainingLab ships as a web app today (its own Tauri shell is still pending),
# so the shortcut starts the one-button LAN server and opens it in the browser.
New-AppShortcut -Name 'TrainingLab' `
  -Target (Join-Path $root 'TrainingLab.bat') `
  -Icon $traininglabIco `
  -Description 'TrainingLab — la sesión de hoy (servidor local + navegador)'

# ── LAN server ─────────────────────────────────────────────────────────────
New-AppShortcut -Name 'LAN Server (Fitness)' `
  -Target (Join-Path $root 'LAN Server.bat') `
  -Icon $traininglabIco `
  -Description 'Sirve BodyLab y TrainingLab para probarlos en el teléfono'

Write-Host ''
Write-Host '✅ Shortcuts installed. If Windows still shows the old icon:' -ForegroundColor Green
Write-Host '   right-click the shortcut > Properties > Change Icon, or sign out/in.' -ForegroundColor Gray
Write-Host ''
