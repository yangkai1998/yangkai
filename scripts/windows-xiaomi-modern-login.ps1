$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== Modern Xiaomi login (OTP supported) ===" -ForegroundColor Cyan
Write-Host "This uses the latest MiService in an isolated environment." -ForegroundColor DarkGray
Write-Host "It does not modify the xiaogpt installation." -ForegroundColor DarkGray
Write-Host ""

try {
    $pythonVersion = & python --version 2>&1
} catch {
    Write-Host "Python was not found." -ForegroundColor Red
    exit 1
}
Write-Host "Found $pythonVersion" -ForegroundColor Green

$venvPath = Join-Path $HOME "xiaomi-auth-venv"
$venvPython = Join-Path $venvPath "Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "Creating isolated authentication environment..." -ForegroundColor Yellow
    & python -m venv $venvPath
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

Write-Host "Installing latest MiService with OTP and Windows certificate support..." -ForegroundColor Yellow
& $venvPython -m pip install -U miservice aiohttp truststore
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install the latest MiService." -ForegroundColor Red
    exit $LASTEXITCODE
}

$miUser = ""
while ($miUser -notmatch "^\d+$") {
    Write-Host ""
    Write-Host "请输入纯数字小米 ID（不要用手机号或 cUserId），然后按回车：" -ForegroundColor Cyan
    $miUser = Read-Host
    if ($miUser -notmatch "^\d+$") {
        Write-Host "小米 ID 必须是纯数字，请重新输入。" -ForegroundColor Red
        $miUser = ""
    }
}

$miPassword = ""
$passwordPtr = [IntPtr]::Zero
while ([string]::IsNullOrEmpty($miPassword)) {
    Write-Host ""
    Write-Host "请输入小米密码，然后按回车（输入过程不会显示字符）：" -ForegroundColor Cyan
    $securePassword = Read-Host -AsSecureString
    $passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $miPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
    if ([string]::IsNullOrEmpty($miPassword)) {
        Write-Host "密码不能为空，请重新输入。" -ForegroundColor Red
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)
        $passwordPtr = [IntPtr]::Zero
    }
}

$tokenPath = Join-Path $HOME ".mi.token"
if (Test-Path $tokenPath) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backup = "$tokenPath.invalid-$stamp"
    Move-Item $tokenPath $backup -Force
    Write-Host "旧 token 已备份到：$backup" -ForegroundColor DarkGray
}

try {
    $env:MI_USER = $miUser
    $env:MI_PASS = $miPassword

    Write-Host ""
    Write-Host "正在登录并查询设备……" -ForegroundColor Yellow
    Write-Host "如果手机收到验证码，终端会显示 Input Phone Code；输入短信验证码并回车。" -ForegroundColor Cyan
    Write-Host ""

    # truststore makes Python use the same Windows certificate store as the browser.
    # This safely supports antivirus/proxy certificates without disabling TLS checks.
    & $venvPython -c "import truststore; truststore.inject_into_ssl(); from miservice.__main__ import main; main()" list
    $result = $LASTEXITCODE

    Write-Host ""
    if ($result -eq 0 -and (Test-Path $tokenPath)) {
        Write-Host "登录成功，认证文件已生成：$tokenPath" -ForegroundColor Green
        Write-Host "请从设备列表中找到 LX06，只记录它的 DID。" -ForegroundColor Cyan
    } else {
        Write-Host "新版登录仍未完成。请发送最后的报错截图（遮住所有凭据）。" -ForegroundColor Yellow
    }
} finally {
    if ($passwordPtr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)
    }
    $miPassword = $null
    Remove-Item Env:MI_PASS -ErrorAction SilentlyContinue
}
