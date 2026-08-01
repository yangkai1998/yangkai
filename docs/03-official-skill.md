# 路径 B：小爱开放平台自定义技能

适合想要「打开杨凯助手」正式入口时使用。需要：

1. 小爱开发者账号
2. 公网 HTTPS 地址
3. 本仓库 `backend` 服务

## 1. 本地启动 backend

```bash
cd backend
cp .env.example .env
```

编辑 `.env`：

```env
LLM_API_KEY=sk-xxx
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
TRIGGER_KEYWORDS=问助手,问杨凯,帮我问
SKILL_SHARED_TOKEN=换成足够长的随机串
```

启动：

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

或：

```bash
# 仓库根目录
docker compose up -d --build
```

验证：

```bash
curl http://127.0.0.1:8080/health
../scripts/smoke_test.sh http://127.0.0.1:8080
```

模拟技能请求：

```bash
curl -X POST 'http://127.0.0.1:8080/xiaoai/skill?token=你的token' \
  -H 'Content-Type: application/json' \
  -d '{
    "version":"1.0",
    "query":"问助手 今天适合晾衣服吗",
    "session":{"session_id":"demo"},
    "request":{"type":1,"intent":{"query":"问助手 今天适合晾衣服吗"}}
  }'
```

## 2. 暴露 HTTPS（无云服务器时）

推荐 Cloudflare Tunnel：

1. 注册 Cloudflare 并添加域名（或用临时 tunnel 测试）
2. 安装 `cloudflared`
3. 创建 tunnel，把公网路径转到 `http://127.0.0.1:8080`
4. 最终技能 URL 示例：

```text
https://xiaoai.your-domain.com/xiaoai/skill?token=你的SKILL_SHARED_TOKEN
```

也可用：
- 云服务器 Nginx + Let’s Encrypt
- 内网穿透（frp / 花生壳），但稳定性通常不如 Tunnel

## 3. 小爱开放平台配置

入口：https://developers.xiaoai.mi.com/

建议配置：

1. 创建自定义技能，调用名：`杨凯助手`
2. 系统意图：
   - 欢迎
   - 退出
   - 无法理解
3. 自定义意图语料：
   - 问助手{question}
   - 问杨凯{question}
   - 帮我问{question}
4. 接口配置：填入上面的 HTTPS Webhook
5. 网页测试通过后，再真机测试

> 注意：平台 UI 会迭代。若菜单名不同，以「自定义技能 + HTTPS 自定义接入」为准。

## 4. 真机话术

1. 「小爱同学，打开杨凯助手」
2. 「问助手，明天适合晾衣服吗」
3. 「退出」

## 5. 响应协议说明

本后端返回小爱常见文本播报结构：

```json
{
  "version": "1.0",
  "response": {
    "open_mic": true,
    "to_speak": {"type": 0, "text": "回答内容"}
  },
  "is_session_end": false
}
```

若平台对字段有更严格校验，把网页测试里的报错贴出来，再针对性兼容。
