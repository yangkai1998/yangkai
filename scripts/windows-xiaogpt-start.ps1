param(
    [string]$XiaomiId,
    [string]$Did
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== XiaoAi DeepSeek configuration and startup ===" -ForegroundColor Cyan
Write-Host ""

if ([string]::IsNullOrWhiteSpace($XiaomiId)) {
    while ($XiaomiId -notmatch "^\d+$") {
        Write-Host "请输入纯数字小米 ID，然后按回车：" -ForegroundColor Cyan
        $XiaomiId = Read-Host
        if ($XiaomiId -notmatch "^\d+$") {
            Write-Host "小米 ID 必须是纯数字。" -ForegroundColor Red
            $XiaomiId = ""
        }
    }
}

if ([string]::IsNullOrWhiteSpace($Did)) {
    while ($Did -notmatch "^\d+$") {
        Write-Host "请输入 LX06 的 DID（纯数字），然后按回车：" -ForegroundColor Cyan
        $Did = Read-Host
        if ($Did -notmatch "^\d+$") {
            Write-Host "DID 必须是纯数字。" -ForegroundColor Red
            $Did = ""
        }
    }
}

$scriptsDir = & python -c "import sysconfig; print(sysconfig.get_path('scripts'))"
$xiaogpt = Join-Path $scriptsDir "xiaogpt.exe"
$tokenPath = Join-Path $HOME ".mi.token"
$setupDir = Join-Path $HOME "xiaoai-setup"
$configPath = Join-Path $setupDir "xiao_config.yaml"
$runnerPath = Join-Path $setupDir "run_xiaogpt_cached.py"

if (-not (Test-Path $xiaogpt)) {
    Write-Host "找不到 xiaogpt.exe，请先运行 windows-xiaoai-setup.ps1。" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $tokenPath)) {
    Write-Host "找不到 $tokenPath，请先完成小米登录。" -ForegroundColor Red
    exit 1
}

$apiKey = ""
$keyPtr = [IntPtr]::Zero
while ([string]::IsNullOrWhiteSpace($apiKey)) {
    Write-Host ""
    Write-Host "请输入新创建的 DeepSeek API Key，然后按回车（输入过程不会显示字符）：" -ForegroundColor Cyan
    $secureKey = Read-Host -AsSecureString
    $keyPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
    $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPtr)
    if ([string]::IsNullOrWhiteSpace($apiKey)) {
        Write-Host "API Key 不能为空。" -ForegroundColor Red
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPtr)
        $keyPtr = [IntPtr]::Zero
    }
}

New-Item -ItemType Directory -Force $setupDir | Out-Null
$safeKey = $apiKey.Replace("'", "''")

$config = @"
hardware: LX06
account: "$XiaomiId"
password: ""
cookie: ""
mi_did: "$Did"

bot: chatgptapi
openai_key: '$safeKey'
api_base: "https://api.deepseek.com/v1"
gpt_options:
  model: "deepseek-v4-flash"
  temperature: 0.7
  extra_body:
    thinking:
      type: "disabled"

keyword:
  - "问助手"
  - "问杨凯"
  - "帮我问"

prompt: "你是居家小爱音箱上的智能助手。请用简洁自然的中文回答，尽量控制在80字以内，不要使用Markdown。"
mute_xiaoai: true
stream: true
verbose: false
use_command: false
tts: mi

start_conversation: "开始持续对话"
end_conversation: "结束持续对话"
"@

$runner = @'
import asyncio
import inspect
import ipaddress
import socket
import subprocess
import sys


XIAOMI_PROFILE_HOST = "userprofile.mina.mi.com"


def resolve_with_powershell(host):
    """Use Windows DNS when Python/asyncio getaddrinfo is broken."""
    command = (
        f"(Resolve-DnsName -Type A '{host}' -ErrorAction Stop | "
        "Where-Object { $_.IPAddress } | "
        "Select-Object -First 1 -ExpandProperty IPAddress)"
    )
    value = subprocess.check_output(
        ["powershell.exe", "-NoProfile", "-Command", command],
        text=True,
        timeout=15,
    ).strip()
    return str(ipaddress.ip_address(value))


try:
    _xiaomi_profile_ip = resolve_with_powershell(XIAOMI_PROFILE_HOST)
except Exception as exc:
    raise RuntimeError(
        f"Windows 无法解析 {XIAOMI_PROFILE_HOST}：{exc}"
    ) from exc

_original_getaddrinfo = socket.getaddrinfo


def getaddrinfo_with_windows_fallback(host, port, *args, **kwargs):
    normalized = host.decode() if isinstance(host, bytes) else str(host)
    if normalized.lower() == XIAOMI_PROFILE_HOST:
        # Only replace DNS resolution. aiohttp still validates TLS against the
        # original URL hostname, so certificate verification remains enabled.
        return _original_getaddrinfo(_xiaomi_profile_ip, port, *args, **kwargs)
    return _original_getaddrinfo(host, port, *args, **kwargs)


socket.getaddrinfo = getaddrinfo_with_windows_fallback

from miservice import MiAccount, MiIOService, MiNAService
from xiaogpt.config import Config
from xiaogpt.xiaogpt import MiGPT


async def login_with_cached_token(self):
    """Use the verified service token without the old forced-login refresh."""
    account = MiAccount(
        self.mi_session,
        self.config.account,
        self.config.password,
        str(self.mi_token_home),
    )
    token = getattr(account, "token", None)
    if token is None and getattr(account, "token_store", None):
        token = account.token_store.load_token()
        if inspect.isawaitable(token):
            token = await token
        account.token = token
    if not token or "micoapi" not in token:
        raise RuntimeError(
            "认证缓存缺少 micoapi，请先运行现代登录脚本和音箱播报测试。"
        )
    self.mina_service = MiNAService(account)
    self.miio_service = MiIOService(account)


MiGPT.login_miboy = login_with_cached_token
config = Config(**Config.read_from_file(sys.argv[1]))


async def run():
    miboy = MiGPT(config)
    try:
        await miboy.run_forever()
    finally:
        await miboy.close()


asyncio.run(run())
'@

try {
    $config | Set-Content -Path $configPath -Encoding UTF8
    $runner | Set-Content -Path $runnerPath -Encoding UTF8
    Write-Host ""
    Write-Host "配置已保存到：$configPath" -ForegroundColor Green
    Write-Host "此文件含 API Key，不要发送或上传。" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "正在启动 xiaogpt。保持此窗口开启。" -ForegroundColor Cyan
    Write-Host "启动成功后请说：小爱同学，问助手，今天适合吃什么？" -ForegroundColor Cyan
    Write-Host ""
    & python $runnerPath $configPath
} finally {
    if ($keyPtr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPtr)
    }
    $apiKey = $null
}
