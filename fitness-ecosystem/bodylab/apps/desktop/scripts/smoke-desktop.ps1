# BodyLab desktop smoke test (binary-level)
# Usage: powershell -ExecutionPolicy Bypass -File smoke-desktop.ps1 [-ExePath <path-to-bodylab.exe>]
#
# Checks:
#   1. Binary exists and has a version resource
#   2. Process launches and creates a visible main window
#   3. Window survives a stability window (no silent crash)
#   4. WebView2 user-data folder is present/observed (storage origin container)
#   5. Graceful close (CloseMainWindow) terminates the process cleanly
# Exit code 0 = PASS, 1 = FAIL.

param(
  [string]$ExePath = ""
)

$ErrorActionPreference = "Stop"
$failures = @()

if (-not $ExePath) {
  # Default: repo-relative release build
  $here = Split-Path -Parent $MyInvocation.MyCommand.Path
  $ExePath = Join-Path $here "..\src-tauri\target\release\bodylab.exe"
}
$ExePath = (Resolve-Path $ExePath).Path

Write-Host "=== BodyLab desktop smoke ==="
Write-Host "exe: $ExePath"

# 1. Binary + version
if (-not (Test-Path $ExePath)) { Write-Host "FAIL: exe not found"; exit 1 }
$v = (Get-Item $ExePath).VersionInfo
Write-Host ("version : {0} (product {1})" -f $v.FileVersion, $v.ProductVersion)
if (-not $v.FileVersion) { $failures += "no version resource" }

# 2. Launch detached, then WAIT for the window instead of sleeping a fixed amount.
#
# The fixed 8s sleep was an arbitrary assumption about how fast WebView2 boots.
# On 2026-10-05 it produced a red smoke run with "no main window title" on a
# machine that had just finished a cargo release build — and the very next run
# of the same binary passed with the title present. A test that goes red on
# timing luck is worse than useless, because it teaches you to ignore it. Same
# deadline, polled, and the assertions below are unchanged: if no window appears
# in 45s the app is genuinely broken, and that still fails.
$WindowDeadlineSeconds = 45
$proc = Start-Process -FilePath $ExePath -PassThru
$alive = $null
$windowed = $false
$waited = 0
while ($waited -lt $WindowDeadlineSeconds) {
  Start-Sleep -Milliseconds 500
  $waited += 0.5
  $alive = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
  if (-not $alive) { break }
  if ($alive.MainWindowTitle) { $windowed = $true; break }
}
if (-not $alive) { Write-Host "FAIL: process exited within $waited s of launch"; exit 1 }
if (-not $windowed) { $failures += "no main window title after ${WindowDeadlineSeconds}s" }
Write-Host ("launched: pid {0} title='{1}' after {2}s" -f $alive.Id, $alive.MainWindowTitle, $waited)

# 3. Stability window — still a fixed 6s of "it did not die".
Start-Sleep -Seconds 6
$alive2 = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
if (-not $alive2) { Write-Host "FAIL: process died during stability window"; exit 1 }
if ($alive2.MainWindowTitle -ne $alive.MainWindowTitle) { $failures += "window title changed mid-run" }
Write-Host ("stability: alive and stable, title '{0}'" -f $alive2.MainWindowTitle)

# 4. WebView2 data container for the identifier
$udd = Join-Path $env:LOCALAPPDATA "com.bodylab.desktop"
if (Test-Path $udd) {
  $idb = Join-Path $udd "EBWebView\Default\IndexedDB"
  $origins = if (Test-Path $idb) { (Get-ChildItem $idb -Directory).Name } else { @() }
  Write-Host ("storage  : UDD exists; IndexedDB origins: {0}" -f ($origins -join ", "))
} else {
  Write-Host "storage  : UDD does not exist yet (first run) - will exist after close"
}

# 5. Graceful close
$null = $alive2.CloseMainWindow()
if (-not $alive2.WaitForExit(10000)) {
  $failures += "did not exit within 10s of CloseMainWindow"
  Stop-Process -Id $proc.Id -Force
  Write-Host "WARN: had to force-kill"
} else {
  Write-Host "closed   : graceful exit confirmed"
}

if ($failures.Count -gt 0) {
  Write-Host ("FAIL: " + ($failures -join "; "))
  exit 1
}
Write-Host "SMOKE PASS"
exit 0
