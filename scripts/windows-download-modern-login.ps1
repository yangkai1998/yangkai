# Safe downloader for modern-login on Windows PowerShell 5.1
$ErrorActionPreference = "Stop"
$setupDir = Join-Path $HOME "xiaoai-setup"
New-Item -ItemType Directory -Force $setupDir | Out-Null

$url = "https://raw.githubusercontent.com/yangkai1998/yangkai/cursor/xiaoai-llm-bridge-c4d6/scripts/windows-xiaomi-modern-login.ps1"
$out = Join-Path $setupDir "modern-login.ps1"

Write-Host "Downloading modern-login.ps1 ..." -ForegroundColor Cyan
$bytes = (Invoke-WebRequest -Uri $url -UseBasicParsing).Content
# Force UTF-8 (no BOM issues for pwsh; PS 5.1 also OK for ASCII-heavy script)
[System.IO.File]::WriteAllText($out, $bytes, [System.Text.UTF8Encoding]::new($false))

Write-Host "Saved: $out" -ForegroundColor Green
Write-Host "Next: close Clash system proxy, then run:" -ForegroundColor Yellow
Write-Host "powershell -ExecutionPolicy Bypass -File `"$out`" -SkipInstall" -ForegroundColor White
