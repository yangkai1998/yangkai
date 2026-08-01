# 小爱音箱接入大模型：详细实施计划

> 目标：居家小爱音箱上，只有特定口令（如「问助手」）才走大模型，回答由音箱语音播报。  
> 约束：你目前没有小米开放平台账号、没有公网服务器、没有 LLM API Key。  
> 结论：**优先走「居家本地桥接」；官方技能作为可选增强。**

---

## 0. 总体架构

### 路径 A（推荐，先做）：居家本地桥接（xiaogpt）

```
你说话：「小爱同学，问助手 明天适合晾衣服吗」
   ↓
小爱音箱正常识别文本
   ↓
家里常开的电脑/NAS 上的 xiaogpt 监听到带口令的问题
   ↓
调用你的大模型 API（OpenAI 兼容）
   ↓
通过小米 TTS 让音箱播报答案
```

优点：
- 不需要小爱开放平台审核
- 不需要公网 HTTPS
- 天然适合「特定口令」
- 社区成熟（xiaogpt）

代价：
- 非官方方案，账号登录/接口偶发失效
- 需要一台常开设备（电脑、NAS、树莓派、软路由等）
- 小爱原厂回答可能抢话（可用 mute 策略缓解，无法 100% 根治）

### 路径 B（可选，后做）：小爱开放平台自定义技能

```
你说话：「小爱同学，打开杨凯助手」
   ↓
进入自定义技能
   ↓
「问助手 明天适合晾衣服吗」
   ↓
小米云调用你的 HTTPS Webhook
   ↓
本仓库 backend 调大模型
   ↓
返回 to_speak，音箱播报
```

优点：更接近官方能力  
代价：要注册开发者、要 HTTPS 公网地址、技能配置和真机调试更重

本仓库已为路径 B 写好后端；路径 A 提供开箱配置。

---

## 1. 你需要准备的东西（按顺序）

### 第 1 步：准备一台常开设备

任选其一：
1. 家里一直开着的电脑
2. NAS（**绿联** / 群晖 / 飞牛 / 威联通等，见 `docs/06-ugreen-nas.md`）
3. 树莓派 / 迷你主机
4. 软路由（若性能够用）

要求：
- 能访问外网（调用大模型 API）
- 能安装 Docker，或能跑 Python 3.10+
- 与小爱音箱同一小米账号生态（同一账号绑定）

### 第 2 步：申请大模型 API Key（必做）

因为你选择「任意强力 LLM + 自备 Key」，推荐优先级（国内可用性优先）：

| 优先级 | 服务商 | 说明 |
|---|---|---|
| 1 | DeepSeek | 便宜、OpenAI 兼容、适合语音短答 |
| 2 | 通义千问（DashScope） | 阿里云，国内稳定 |
| 3 | Moonshot / Kimi | OpenAI 兼容 |
| 4 | OpenAI 官方 | 需可访问外网或中转 |

你拿到后会得到：
- `API Key`
- `Base URL`（如 `https://api.deepseek.com/v1`）
- `Model`（如 `deepseek-chat`）

### 第 3 步：收集小爱音箱信息

1. 音箱底部型号（如 `LX06`、`L05B`、`X10A`）
2. 绑定音箱的小米账号（建议使用「小米 ID」，不是邮箱展示名）
3. 音箱 DID（下一步脚本获取）

---

## 2. 路径 A 执行清单（推荐，今天就能试）

### A1. 克隆本仓库到常开设备

```bash
git clone https://github.com/yangkai1998/yangkai.git
cd yangkai
```

### A2. 获取音箱 DID

```bash
pip install -U miservice_fork
export MI_USER='你的小米账号'
export MI_PASS='你的密码'
micli list
```

把输出里音箱对应的 DID 记下来。  
若登录风控失败，改用 cookie 登录（见 `docs/02-home-path.md`）。

### A3. 写配置

```bash
cp home/xiao_config.yaml.example home/xiao_config.yaml
# 编辑 home/xiao_config.yaml，填入：
# - hardware
# - account/password 或 cookie
# - mi_did
# - openai_key / api_base / model
# - keyword: ["问助手","问杨凯","帮我问"]
```

### A4. 启动

Docker：

```bash
cd home
docker compose up -d
docker compose logs -f
```

或本机 Python（也可直接用上游 xiaogpt）：

```bash
pip install -U "xiaogpt[locked]"
xiaogpt --config home/xiao_config.yaml --use_chatgpt_api --mute_xiaoai --stream
```

### A5. 音箱联调话术

1. 「小爱同学，问助手，明天适合晾衣服吗」
2. 「小爱同学，问杨凯，番茄炒蛋怎么做」
3. 不带口令：「小爱同学，播放轻音乐」——应仍走原生小爱，不进大模型

成功标准：
- 控制台能看到大模型回复文本
- 音箱播报的是大模型内容（或至少能听到补充播报）

### A6. 常见坑（先看这里）

1. **登录失败**：多半是小米风控，改 cookie
2. **终端有字但音箱不说**：部分型号加 `use_command: true`
3. **小爱抢话**：保持 `mute_xiaoai: true`；LX06 未刷机时通常仍会先出 1～2 秒原厂语音（云端落盘延迟），详见 `docs/04-troubleshooting.md`
4. **回答太长**：prompt 已限制字数；还可把 `max_tokens` 调小

详细操作见：`docs/02-home-path.md`

---

## 3. 路径 B 执行清单（官方技能，可选增强）

> 适合你以后想要「打开某某助手」这种正式技能入口时再做。

### B1. 注册小爱开放平台

1. 打开：https://developers.xiaoai.mi.com/
2. 用小米账号登录并完成开发者注册
3. 创建自定义技能（聊天/自定义技能）
4. 设置调用名，例如：`杨凯助手`
5. 配置系统意图：欢迎 / 退出 / 无法理解
6. 配置自定义意图，语料示例：
   - 问助手{question}
   - 问杨凯{question}
   - 帮我问{question}

### B2. 部署本仓库 backend（需要 HTTPS）

本机先跑通：

```bash
cd backend
cp .env.example .env
# 填写 LLM_API_KEY / LLM_BASE_URL / LLM_MODEL / SKILL_SHARED_TOKEN
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

健康检查：

```bash
curl http://127.0.0.1:8080/health
./scripts/smoke_test.sh
```

公网 HTTPS（无云服务器时推荐 Cloudflare Tunnel）：

1. 安装 `cloudflared`
2. 登录 Cloudflare，创建 tunnel
3. 把 `https://你的域名/xiaoai/skill?token=你的SKILL_SHARED_TOKEN` 指向 `localhost:8080`
4. 在小爱开放平台「接口配置 / 自定义接入」填该 URL

也可用 Docker：

```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env
docker compose up -d --build
```

### B3. 平台联调

1. 开放平台网页测试：打开技能 → 发送「问助手 今天吃什么」
2. 真机：音箱账号与开发者账号一致  
   「小爱同学，打开杨凯助手」→「问助手，明天适合晾衣服吗」
3. 成功标准：音箱播报大模型短答，且无口令时提示用法

详细操作见：`docs/03-official-skill.md`

---

## 4. 我（Cloud Agent）已经完成 / 无法代你完成

### 已完成（仓库内）

1. 完整实施计划（本文）
2. 官方技能 Webhook 后端（FastAPI）
3. 口令触发、会话短记忆、TTS 响应协议
4. Docker 部署文件
5. 居家 xiaogpt 配置模板
6. 分步文档与排错文档
7. 自动化单测与冒烟脚本

### 必须你本人完成（涉及账号与设备）

1. 申请 LLM API Key
2. 在常开设备上部署并保持运行
3. 登录小米账号获取 DID / cookie
4. （可选）注册小爱开放平台并配置技能
5. （可选）配置 Cloudflare Tunnel 或云服务器 HTTPS
6. 对着真实音箱做验收

---

## 5. 建议落地顺序（最小阻力）

1. **今天**：拿 DeepSeek/通义 API Key  
2. **今天**：在常开电脑跑通路径 A（xiaogpt）  
3. **验收**：口令触发、语音播报、非口令不干扰  
4. **稳定后（可选）**：再做路径 B 官方技能 + 本仓库 backend  
5. **长期**：把服务做成开机自启（systemd / Docker restart）

---

## 6. 验收标准

- [ ] 「问助手 xxx」能听到智能回答  
- [ ] 不带口令的原生指令仍可用（播放音乐、控制灯等）  
- [ ] 回答偏短、适口语，不念 Markdown  
- [ ] 服务重启后可自动恢复  
- [ ] API Key / 小米密码没有提交到 Git
