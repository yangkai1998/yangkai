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

### 3) 小爱抢着回答

1. 保持 `mute_xiaoai: true`
2. 说完口令后稍停顿
3. 接受现状：非刷机方案很难 100% 打断原厂 TTS

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
