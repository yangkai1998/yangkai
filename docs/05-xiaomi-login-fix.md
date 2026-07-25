# 小米登录失败（Login failed / userId）怎么办

现象：

```text
KeyError: 'userId'
Login failed
```

同时：网页能正常登录小米账号。

结论：**通常不是密码错，而是小米风控拦了脚本登录。**

---

## 0. 配置文件放对位置

只允许写到：

```text
home/xiao_config.yaml
```

**不要**写到 `home/xiao_config.yaml.example`（这个文件会被 Git 跟踪）。

Windows：

```powershell
cd 你的仓库目录
copy home\xiao_config.yaml.example home\xiao_config.yaml
notepad home\xiao_config.yaml
```

---

## 1. 账号改用「小米 ID」数字

不要只用手机号。

1. 手机打开「小米账号 / 个人信息」
2. 找到 **小米 ID**（一串数字）
3. 配置和命令都改用这个数字：

```powershell
$env:MI_USER = "你的小米ID数字"
$env:MI_PASS = "你的密码"
```

`xiao_config.yaml`：

```yaml
account: "你的小米ID数字"
password: "你的密码"
```

---

## 2. 先试这个社区 workaround（很多人有效）

同一 PowerShell 窗口：

```powershell
$env:MI_USER = "你的小米ID数字"
$env:MI_PASS = "你的密码"
micli play
micli list
```

成功后：

1. 用户目录会出现 `C:\Users\你的用户名\.mi.token`
2. 终端会列出设备，复制音箱 `did`

---

## 3. 仍失败：换家庭 Wi‑Fi 再试

官方/社区常见提示：换网络后风控会消失。

```powershell
micli list
```

---

## 4. 推荐：用浏览器 passToken 自动生成 `.mi.token`

如果错误是：

```text
KeyError: 'userId'
Login failed
```

说明密码登录被小米拦截。使用仓库里的引导脚本，不需要手写 JSON。

### 4.1 在浏览器取得 3 个值

1. 登录：https://account.xiaomi.com
2. 同一浏览器打开：  \
   `https://account.xiaomi.com/pass/serviceLogin?sid=xiaomiio&_json=true`
3. 按 `F12`
4. 切到 `Application（应用）`；若没有则找 `Storage（存储）`
5. 左边展开 `Cookies`
6. 点击 `https://account.xiaomi.com`
7. 找到并保留这三个值：
   - `userId`：值必须是纯数字；**不要复制 `cUserId`**（它通常以字母开头）
   - `passToken`
   - `deviceId`

`passToken` 等同密码，绝对不要截图或发给别人。

### 4.2 下载并运行脚本

PowerShell：

```powershell
Invoke-WebRequest `
  "https://raw.githubusercontent.com/yangkai1998/yangkai/cursor/xiaoai-llm-bridge-c4d6/scripts/windows-xiaomi-token.ps1" `
  -OutFile "$HOME\xiaoai-setup\xiaomi-token.ps1"
pwsh -ExecutionPolicy Bypass -File "$HOME\xiaoai-setup\xiaomi-token.ps1"
```

按提示分别粘贴三个值。输入 `passToken` 时屏幕不会显示字符。

脚本会：

1. 写入 `C:\Users\你的用户名\.mi.token`
2. 自动运行 `micli list`
3. 若认证成功，显示设备列表和 DID

---

## 5. 备选：抓「小爱对话」Cookie（不是商城 Cookie）

关键：要从小爱相关域名抓，不要只从 `mi.com` 商城页抓。

1. Chrome/Edge 登录小米账号
2. 打开（需已登录）：  
   `https://www.xiaoe.ai/` 或小爱相关页面；更稳的是抓：  
   `https://userprofile.mina.mi.com/device_profile/v2/conversation`
3. `F12` → Network → 刷新
4. 找到该请求，复制完整 `Cookie`
5. Cookie 里最好能看到 `userId`、`serviceToken` 等字段

然后启动：

```powershell
xiaogpt --hardware LX06 --account 你的小米ID --cookie "整段Cookie" --use_chatgpt_api --mute_xiaoai --stream
```

或在 `xiao_config.yaml`：

```yaml
account: "你的小米ID数字"
cookie: "整段Cookie"
# password 可留空
```

---

## 6. 拿到 DID 后最小可运行配置

```yaml
hardware: LX06
account: "小米ID数字"
password: "密码"          # 若只用 cookie，可留空
cookie: "可选"
mi_did: "音箱DID"
openai_key: "sk-xxx"
api_base: "https://api.deepseek.com/v1"
gpt_options:
  model: "deepseek-v4-flash"
keyword:
  - "问助手"
  - "问杨凯"
  - "帮我问"
mute_xiaoai: true
stream: true
verbose: true
```

启动：

```powershell
python -m pip install -U "xiaogpt[locked]"
xiaogpt --config home\xiao_config.yaml --use_chatgpt_api --mute_xiaoai --stream
```

---

## 7. 安全

如果 Key / Cookie 曾经写进 example 或发到聊天：

1. DeepSeek：删旧 Key，新建 Key
2. 小米：建议改密码，并重新登录浏览器后再抓新 Cookie
