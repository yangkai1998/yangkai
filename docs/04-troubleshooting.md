# 排错手册

## 居家桥接（xiaogpt）

### 1) 登录失败 / Login failed

原因：小米风控或账号二次验证。  
处理：

1. 改用 cookie
2. 在可登录设备生成 token 后拷贝
3. 避免频繁换 IP 重试

### 2) 控制台有答案，音箱不播

1. 配置 `use_command: true`
2. 确认 `hardware` 型号正确（`micli mina`）
3. 确认 `mi_did` 指向的是这台音箱，不是别的设备

### 3) 小爱抢着回答（先说几个字再播大模型）

这是 **LX06 + xiaogpt 居家桥接的原理限制**，不是你配置写错了。

**为什么会这样：**

1. 电脑程序只能通过小米云端接口「轮询」最新对话
2. 云端必须先把这次对话「落盘」后，程序才能发现并打断
3. 落盘前的约 1～2 秒，原厂小爱已经开始说话
4. `mute_xiaoai: true` 的作用是尽快打断并改播 DeepSeek，**不能从零秒就完全静音**

上游作者也明确说过：完全 mute 要么会导致原生小爱功能失效，要么需要极高频请求，正式方案不会默认这样做。

**你可以怎么做（按推荐顺序）：**

| 方案 | 效果 | 适合谁 |
|------|------|--------|
| A. 确认 `mute_xiaoai: true`（你这边一般已开） | 缩短抢话，通常只剩几个字 | 所有人，必做 |
| B. 小爱 App 里关掉「大模型 / AI 增强回答」相关开关（若有） | 原厂前缀更短、更干巴 | 想少听废话 |
| C. 口令后稍停顿，问题尽量短 | 减少 ASR/落盘等待 | 日常习惯 |
| D. 接受「先说 1～2 秒原厂再播 DeepSeek」 | 最稳，保留原生控灯/音乐 | 居家日常推荐 |
| E. 自己改 xiaogpt 源码把 sleep 改成 0 | 抢话更少，但疯狂打小米接口，易风控 | 仅演示，不建议长期 |
| F. 刷机 / Open-XiaoAI / 自定义固件 | 才能接近真正静音原厂 TTS | 愿意折腾硬件 |

**方案 A 自检（PowerShell）：**

```powershell
Select-String -Path "$HOME\xiaoai-setup\xiao_config.yaml" -Pattern "mute_xiaoai"
```

应看到 `mute_xiaoai: true`。改完后必须重启桥接：

```powershell
python "$HOME\xiaoai-setup\run_xiaogpt_cached.py" "$HOME\xiaoai-setup\xiao_config.yaml"
```

**结论：** 未刷机的 LX06，**无法 100% 消灭**「小爱先说几个字」；当前最佳体验是 `mute_xiaoai: true` + 接受极短前缀，或走刷机路径追求完美静音。

### 4) 不带口令也进大模型 / 带口令不进

检查 `keyword` 列表是否包含你实际说的前缀。  
建议固定短口令：`问助手`。

### 5) 大模型超时或连不上

1. 检查 `api_base` 是否可达
2. 国内模型优先（DeepSeek/通义）
3. 需要代理时配置系统代理或可访问的中转网关

## 官方技能 backend

### 1) `/health` 不通

1. 容器是否起来：`docker compose ps`
2. 端口是否映射 `8080`
3. 看日志：`docker compose logs xiaoai-bridge`

### 2) 返回 401 unauthorized

URL 是否带对 `?token=`，且与 `.env` 中 `SKILL_SHARED_TOKEN` 一致。

### 3) 小爱说“遇到问题”

常见原因：

1. Webhook 不是 HTTPS
2. 响应超过平台超时（后端已限制 LLM 超时约 8 秒）
3. 返回 JSON 不合规
4. 服务宕机

先用 `scripts/smoke_test.sh` 和 `/debug/ask` 排除自身服务问题。

### 4) 命中技能但不调大模型

1. 是否说了触发口令
2. `TRIGGER_KEYWORDS` 是否包含该口令
3. 平台是否把完整 query 传到 webhook（看 backend 日志）

## 安全与隐私

1. 轮换泄露过的 API Key
2. cookie / 密码只放本机配置，不进仓库
3. 公网技能务必启用 `SKILL_SHARED_TOKEN`
