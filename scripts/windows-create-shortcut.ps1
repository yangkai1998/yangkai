$ErrorActionPreference = "Stop"

$setupDir = Join-Path $HOME "xiaoai-setup"
$restartScript = Join-Path $setupDir "restart-xiaogpt.ps1"
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "启动小爱DeepSeek.lnk"
$batPath = Join-Path $setupDir "启动小爱DeepSeek.bat"

# Always refresh the local restart script from the same folder as this helper when available.
$sourceRestart = Join-Path $PSScriptRoot "windows-restart-xiaogpt.ps1"
if (Test-Path $sourceRestart) {
    New-Item -ItemType Directory -Force $setupDir | Out-Null
    Copy-Item $sourceRestart $restartScript -Force
}

if (-not (Test-Path $restartScript)) {
    Write-Host "找不到重启脚本：$restartScript" -ForegroundColor Red
    Write-Host "请先下载 restart 脚本到 xiaoai-setup 目录。" -ForegroundColor Yellow
    exit 1
}

$bat = @"
@echo off
title XiaoAi DeepSeek
cd /d "%USERPROFILE%"
pwsh -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\xiaoai-setup\restart-xiaogpt.ps1"
if errorlevel 1 pause
"@
$bat | Set-Content -Path $batPath -Encoding ASCII

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $batPath
$shortcut.WorkingDirectory = $setupDir
$shortcut.WindowStyle = 1
$shortcut.Description = "启动小爱音箱 DeepSeek 助手"
$shortcut.Save()

Write-Host ""
Write-Host "已创建桌面快捷方式：" -ForegroundColor Green
Write-Host $shortcutPath
Write-Host ""
Write-Host "也可直接双击：" -ForegroundColor Cyan
Write-Host $batPath
Write-Host ""
Write-Host "以后终端关了，双击桌面「启动小爱DeepSeek」即可。" -ForegroundColor Cyan
