param(
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "=== Modern Xiaomi login (OTP supported) ===" -ForegroundColor Cyan
Write-Host "Uses latest MiService in an isolated venv." -ForegroundColor DarkGray
Write-Host "Does not modify the xiaogpt installation." -ForegroundColor DarkGray
Write-Host ""

try {
    $pythonVersion = & python --version 2>&1
} catch {
    Write-Host "Python was not found. Install Python 3.12+ and reopen PowerShell." -ForegroundColor Red
    exit 1
}
Write-Host "Found $pythonVersion" -ForegroundColor Green

$setupDir = Join-Path $HOME "xiaoai-setup"
New-Item -ItemType Directory -Force $setupDir | Out-Null

$venvPath = Join-Path $HOME "xiaomi-auth-venv"
$venvPython = Join-Path $venvPath "Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "Creating isolated authentication environment..." -ForegroundColor Yellow
    & python -m venv $venvPath
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

if ($SkipInstall) {
    Write-Host "Skip install: reuse existing auth venv." -ForegroundColor Green
    if (-not (Test-Path $venvPython)) {
        Write-Host "Auth venv missing. Re-run WITHOUT -SkipInstall first." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Installing latest MiService + truststore..." -ForegroundColor Yellow
    & $venvPython -m pip install -U miservice aiohttp truststore
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install MiService. Open Clash/proxy and retry without -SkipInstall." -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

$miUser = ""
while ($miUser -notmatch "^\d+$") {
    Write-Host ""
    Write-Host "Enter numeric Xiaomi ID (digits only), then Enter:" -ForegroundColor Cyan
    $miUser = Read-Host
    if ($miUser -notmatch "^\d+$") {
        Write-Host "Xiaomi ID must be digits only." -ForegroundColor Red
        $miUser = ""
    }
}

$miPassword = ""
$passwordPtr = [IntPtr]::Zero
while ([string]::IsNullOrEmpty($miPassword)) {
    Write-Host ""
    Write-Host "Enter Xiaomi password (hidden), then Enter:" -ForegroundColor Cyan
    $securePassword = Read-Host -AsSecureString
    $passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $miPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
    if ([string]::IsNullOrEmpty($miPassword)) {
        Write-Host "Password cannot be empty." -ForegroundColor Red
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)
        $passwordPtr = [IntPtr]::Zero
    }
}

$tokenPath = Join-Path $HOME ".mi.token"
if (Test-Path $tokenPath) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backup = "$tokenPath.invalid-$stamp"
    Move-Item $tokenPath $backup -Force
    Write-Host "Old token backed up to: $backup" -ForegroundColor DarkGray
}

# Avoid python -c quoting issues on Windows PowerShell 5.1
$helperPy = Join-Path $setupDir "mi_modern_login_helper.py"
@'
import truststore

truststore.inject_into_ssl()
from miservice.__main__ import main

raise SystemExit(main())
'@ | Set-Content -Path $helperPy -Encoding UTF8

try {
    $env:MI_USER = $miUser
    $env:MI_PASS = $miPassword

    Write-Host ""
    Write-Host "Logging in and listing devices..." -ForegroundColor Yellow
    Write-Host "If phone gets SMS code, terminal shows Input Phone Code. Type code and Enter." -ForegroundColor Cyan
    Write-Host "TIP: turn OFF Clash/system proxy during Xiaomi login." -ForegroundColor Yellow
    Write-Host ""

    & $venvPython $helperPy list
    $result = $LASTEXITCODE

    Write-Host ""
    if ($result -eq 0 -and (Test-Path $tokenPath)) {
        Write-Host "Login OK. Token saved to: $tokenPath" -ForegroundColor Green
        Write-Host "Find LX06 in the device list and note its DID." -ForegroundColor Cyan
        Write-Host "Then restart bridge:" -ForegroundColor Cyan
        Write-Host 'python "$HOME\xiaoai-setup\run_xiaogpt_cached.py" "$HOME\xiaoai-setup\xiao_config.yaml"' -ForegroundColor White
    } else {
        Write-Host "Login not finished. Send error text with passwords/codes hidden." -ForegroundColor Yellow
        Write-Host "If SSL/proxy errors: open Clash only to reinstall packages, then close it and login again with -SkipInstall." -ForegroundColor Yellow
    }
} finally {
    if ($passwordPtr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)
    }
    $miPassword = $null
    Remove-Item Env:MI_PASS -ErrorAction SilentlyContinue
}
