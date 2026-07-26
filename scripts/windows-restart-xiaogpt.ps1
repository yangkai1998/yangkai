$ErrorActionPreference = "Stop"

$configPath = Join-Path $HOME "xiaoai-setup\xiao_config.yaml"
$runnerPath = Join-Path $HOME "xiaoai-setup\run_xiaogpt_cached.py"
$tokenPath = Join-Path $HOME ".mi.token"

Write-Host ""
Write-Host "=== 重新启动 XiaoAi + DeepSeek ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $configPath)) {
    Write-Host "找不到配置文件：$configPath" -ForegroundColor Red
    Write-Host "请先运行 start-xiaogpt.ps1 完成首次配置。" -ForegroundColor Yellow
    Read-Host "按回车退出"
    exit 1
}

if (-not (Test-Path $runnerPath)) {
    Write-Host "找不到启动器：$runnerPath" -ForegroundColor Red
    Write-Host "请先运行 start-xiaogpt.ps1 完成首次配置。" -ForegroundColor Yellow
    Read-Host "按回车退出"
    exit 1
}

if (-not (Test-Path $tokenPath)) {
    Write-Host "找不到小米认证：$tokenPath" -ForegroundColor Red
    Write-Host "请先运行 modern-login.ps1 -SkipInstall，再做一次音箱播报测试。" -ForegroundColor Yellow
    Read-Host "按回车退出"
    exit 1
}

Write-Host "使用已有配置，无需重新输入 API Key。" -ForegroundColor Green
Write-Host "配置：$configPath" -ForegroundColor DarkGray
Write-Host "保持此窗口开启。对着音箱说：小爱同学，问助手，……" -ForegroundColor Cyan
Write-Host ""

& python $runnerPath $configPath
$code = $LASTEXITCODE

Write-Host ""
if ($code -ne 0) {
    Write-Host "程序已退出，退出码：$code" -ForegroundColor Yellow
} else {
    Write-Host "程序已退出。" -ForegroundColor Yellow
}
Read-Host "按回车关闭窗口"
