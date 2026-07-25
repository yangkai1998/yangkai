# 路径 A：Windows 家里电脑操作指南（PowerShell）

适用于：Windows 10/11 + PowerShell，音箱型号如 `LX06`。

> 注意：PowerShell **不能**使用 Linux 的 `export` 命令。  
> 正确写法是 `$env:变量名 = "值"`。

---

## 0. 安全提醒

1. 小米账号、密码、API Key **不要发到聊天、不要截图发群**
2. 如果密码已经出现在聊天/截图里，先去小米账号改密码
3. 本地配置只写进 `home/xiao_config.yaml`（已被 gitignore）

---

## 1. 安装 Python（一次性）

### 方式 A：官网安装（推荐新手）

1. 打开：https://www.python.org/downloads/
2. 下载并安装最新 Python 3.12/3.13 Windows 版
3. **安装时务必勾选** `Add python.exe to PATH`
4. 安装完成后，**关掉并重新打开** PowerShell

验证：

```powershell
python --version
python -m pip --version
```

两条都能输出版本号，再继续。

### 方式 B：Microsoft Store

1. 打开 Microsoft Store
2. 搜索 `Python 3.12` 并安装
3. 重新打开 PowerShell，再执行上面的验证命令

---

## 2. 安装 micli 工具

在 PowerShell 执行：

```powershell
python -m pip install -U miservice_fork
```

如果提示权限问题，可改用：

```powershell
python -m pip install -U --user miservice_fork
```

---

## 3. 获取音箱 DID（Windows 正确命令）

把下面的账号密码换成你自己的（**不要发给我**）：

```powershell
$env:MI_USER = "你的小米账号手机号或邮箱"
$env:MI_PASS = "你的小米密码"
python -m micli list
```

如果 `python -m micli` 报找不到模块，再试：

```powershell
micli list
```

成功时会列出设备，找到小爱音箱那一行，记下 `did`（一串数字）。

查看型号（可选）：

```powershell
python -m micli mina
```

### 常见报错

| 现象 | 处理 |
|---|---|
| `pip 不是内部或外部命令` | Python 没装好或没勾选 PATH，重装并重开终端 |
| `export 不是...` | 你在用 Linux 写法；改用 `$env:MI_USER = "..."` |
| 登录失败 / Login failed | 小米风控；先改密码后重试，仍失败再改 cookie 方案 |
| 列表为空 | 确认音箱已绑定到同一小米账号，手机米家能看到 |

---

## 4. 填写本地配置

假设仓库在 `D:\code\yangkai`（按你实际路径改）：

```powershell
cd D:\code\yangkai
copy home\xiao_config.yaml.example home\xiao_config.yaml
notepad home\xiao_config.yaml
```

至少改这些：

```yaml
hardware: LX06
account: "你的小米账号"
password: "你的小米密码"
mi_did: "上一步拿到的DID"
openai_key: "sk-你的DeepSeek密钥"
api_base: "https://api.deepseek.com/v1"
gpt_options:
  model: "deepseek-v4-flash"
```

---

## 5. 启动（两种任选）

### 方案 A：直接用 Python 跑（Windows 最简单）

```powershell
python -m pip install -U "xiaogpt[locked]"
cd D:\code\yangkai
xiaogpt --config home\xiao_config.yaml --use_chatgpt_api --mute_xiaoai --stream
```

窗口保持开着。看到日志在跑后，对音箱说：

「小爱同学，问助手，明天适合晾衣服吗」

### 方案 B：Docker Desktop

1. 安装 Docker Desktop for Windows  
2. 启动 Docker 后执行：

```powershell
cd D:\code\yangkai\home
docker compose up -d
docker compose logs -f
```

---

## 6. 联调话术

- 触发大模型：「小爱同学，问助手，番茄炒蛋怎么做」
- 不触发：「小爱同学，播放轻音乐」

---

## 7. 做完后回传给我这些（可打码）

1. `python -m micli list` 的输出截图（可遮住无关设备）
2. 是否已拿到 DID
3. 启动日志最后十几行（不要带密码/Key）
