param(
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== XiaoAi + LLM Windows setup ===" -ForegroundColor Cyan
Write-Host "This script does not upload or save your password." -ForegroundColor DarkGray
Write-Host ""

try {
    $pythonVersion = & python --version 2>&1
} catch {
    Write-Host "Python was not found. Install Python 3.12 and reopen PowerShell." -ForegroundColor Red
    exit 1
}

Write-Host "[1/4] Found $pythonVersion" -ForegroundColor Green

$minor = & python -c "import sys; print(sys.version_info.minor)"
if ([int]$minor -gt 12) {
    Write-Host "xiaogpt requires Python below 3.13. Please install Python 3.12." -ForegroundColor Red
    exit 1
}

if ($SkipInstall) {
    Write-Host "[2/4] Skipping package installation (already installed)." -ForegroundColor Green
} else {
    Write-Host "[2/4] Installing required packages (this may take several minutes)..." -ForegroundColor Yellow
    & python -m pip install -U miservice_fork
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install miservice_fork." -ForegroundColor Red
        exit $LASTEXITCODE
    }

    & python -m pip install -U --force-reinstall "xiaogpt[locked]"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install xiaogpt." -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

$scriptsDir = & python -c "import sysconfig; print(sysconfig.get_path('scripts'))"
$micli = Join-Path $scriptsDir "micli.exe"
$xiaogpt = Join-Path $scriptsDir "xiaogpt.exe"

if (-not (Test-Path $micli)) {
    Write-Host "micli.exe was not found at: $micli" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $xiaogpt)) {
    Write-Host "xiaogpt.exe was not found at: $xiaogpt" -ForegroundColor Red
    exit 1
}

Write-Host "[3/4] Installation completed." -ForegroundColor Green
Write-Host "micli:   $micli" -ForegroundColor DarkGray
Write-Host "xiaogpt: $xiaogpt" -ForegroundColor DarkGray
Write-Host ""

$miUser = ""
while ([string]::IsNullOrWhiteSpace($miUser)) {
    Write-Host ""
    Write-Host "现在请输入小米 ID 数字（不是手机号），然后按回车：" -ForegroundColor Cyan
    $miUser = Read-Host
    if ([string]::IsNullOrWhiteSpace($miUser)) {
        Write-Host "小米 ID 不能为空，请重新输入。" -ForegroundColor Red
    }
}

$miPassword = ""
$passwordPtr = [IntPtr]::Zero
while ([string]::IsNullOrEmpty($miPassword)) {
    Write-Host ""
    Write-Host "现在请输入小米账号密码，然后按回车（输入时屏幕不会显示字符，这是正常的）：" -ForegroundColor Cyan
    $securePassword = Read-Host -AsSecureString
    $passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $miPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
    if ([string]::IsNullOrEmpty($miPassword)) {
        Write-Host "密码不能为空，请重新输入。" -ForegroundColor Red
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)
        $passwordPtr = [IntPtr]::Zero
    }
}

try {
    $env:MI_USER = $miUser
    $env:MI_PASS = $miPassword

    Write-Host ""
    Write-Host "[4/4] Trying Xiaomi login and device discovery..." -ForegroundColor Yellow
    Write-Host "The first command may show an error; that is expected. The second command is the result." -ForegroundColor DarkGray

    & $micli play
    & $micli list

    $tokenPath = Join-Path $HOME ".mi.token"
    Write-Host ""
    if (Test-Path $tokenPath) {
        Write-Host "Authentication token created: $tokenPath" -ForegroundColor Green
    } else {
        Write-Host "No .mi.token was created. Xiaomi likely blocked script login." -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "If a device list appeared, copy only the LX06 DID (never share password, Cookie, token, or API key)." -ForegroundColor Cyan
    Write-Host "If login still failed, send only the error text/screenshot with secrets covered." -ForegroundColor Cyan
} finally {
    if ($passwordPtr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)
    }
    Remove-Item Env:MI_PASS -ErrorAction SilentlyContinue
}
