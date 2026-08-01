$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== Xiaomi browser-token setup ===" -ForegroundColor Cyan
Write-Host "Use this only after password login failed with KeyError: userId." -ForegroundColor DarkGray
Write-Host ""
Write-Host "Before continuing:" -ForegroundColor Yellow
Write-Host "1. Log in at https://account.xiaomi.com"
Write-Host "2. Open this URL in the same browser:"
Write-Host "   https://account.xiaomi.com/pass/serviceLogin?sid=xiaomiio&_json=true"
Write-Host "3. Press F12 -> Application (or Storage) -> Cookies -> https://account.xiaomi.com"
Write-Host "4. Locate cookie values named userId, passToken, and deviceId"
Write-Host ""
Write-Host "Never send these values to anyone. passToken is equivalent to a password." -ForegroundColor Red
Write-Host ""

function Read-RequiredText {
    param(
        [string]$Prompt
    )

    $value = ""
    while ([string]::IsNullOrWhiteSpace($value)) {
        Write-Host $Prompt -ForegroundColor Cyan
        $value = Read-Host
        if ([string]::IsNullOrWhiteSpace($value)) {
            Write-Host "This value cannot be empty." -ForegroundColor Red
        }
    }
    return $value.Trim()
}

function Read-RequiredSecret {
    param(
        [string]$Prompt
    )

    while ($true) {
        Write-Host $Prompt -ForegroundColor Cyan
        Write-Host "(Nothing will appear while typing. Press Enter when finished.)" -ForegroundColor DarkGray
        $secureValue = Read-Host -AsSecureString
        $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
        try {
            $plainValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
            if (-not [string]::IsNullOrWhiteSpace($plainValue)) {
                return $plainValue.Trim()
            }
        } finally {
            if ($ptr -ne [IntPtr]::Zero) {
                [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
            }
        }
        Write-Host "This value cannot be empty." -ForegroundColor Red
    }
}

$userId = ""
while ($userId -notmatch "^\d+$") {
    $userId = Read-RequiredText "Paste the userId cookie value (digits only; do NOT use cUserId):"
    if ($userId -notmatch "^\d+$") {
        Write-Host "Wrong value: userId must contain digits only. You probably copied cUserId." -ForegroundColor Red
        $userId = ""
    }
}
$deviceId = Read-RequiredText "Paste the deviceId cookie value:"
$passToken = Read-RequiredSecret "Paste the passToken cookie value:"

$tokenPath = Join-Path $HOME ".mi.token"
$backupPath = "$tokenPath.backup"

if (Test-Path $tokenPath) {
    Copy-Item $tokenPath $backupPath -Force
    Write-Host "Existing token backed up to: $backupPath" -ForegroundColor DarkGray
}

$token = [ordered]@{
    deviceId = $deviceId
    userId = $userId
    passToken = $passToken
}

$token | ConvertTo-Json | Set-Content -Path $tokenPath -Encoding UTF8
$passToken = $null

Write-Host ""
Write-Host "Token cache created at: $tokenPath" -ForegroundColor Green
Write-Host "Testing Xiaomi device discovery..." -ForegroundColor Yellow

$scriptsDir = & python -c "import sysconfig; print(sysconfig.get_path('scripts'))"
$micli = Join-Path $scriptsDir "micli.exe"
if (-not (Test-Path $micli)) {
    Write-Host "micli.exe was not found. Run windows-xiaoai-setup.ps1 first." -ForegroundColor Red
    exit 1
}

$env:MI_USER = $userId
$env:MI_PASS = "browser-token-auth"

try {
    & $micli list
} finally {
    Remove-Item Env:MI_PASS -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "If a device list appeared, copy only the LX06 DID." -ForegroundColor Cyan
Write-Host "Never share .mi.token, passToken, Cookie, password, or API key." -ForegroundColor Cyan
