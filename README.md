# yangkai · 小爱音箱大模型桥接

让家里的**小爱音箱**在特定口令（如「问助手」）下调用大模型，并用音箱语音播报答案。

> 详细逐步计划请先看：[PLAN.md](./PLAN.md)

## 你适合哪条路

| 路径 | 适合谁 | 需要什么 |
|---|---|---|
| **A. 居家桥接（推荐）** | 先用起来 | 常开设备 + 小米账号 + LLM Key |
| **B. 官方自定义技能** | 想要正式技能入口 | 开放平台账号 + HTTPS + 本仓库 backend |

当前仓库对两条路都准备好了配置与文档。

## 仓库结构

```text
PLAN.md                 # 总计划与验收标准
docs/                   # 分步操作与排错
backend/                # 官方技能 Webhook（FastAPI + OpenAI 兼容 LLM）
home/                   # 居家 xiaogpt 配置与 docker-compose
scripts/smoke_test.sh   # 后端冒烟测试
```

## 5 分钟理解用法

对着音箱说：

```text
小爱同学，问助手，明天适合晾衣服吗？
```

- 带口令：走大模型
- 不带口令：仍由原生小爱处理（播放音乐、控灯等）

## 快速开始

### 路径 A（推荐）

1. 阅读 [docs/01-prerequisites.md](./docs/01-prerequisites.md)
2. 按设备选文档：
   - **Windows**： [docs/02-home-path-windows.md](./docs/02-home-path-windows.md)
   - **绿联 NAS（推荐常开）**： [docs/06-ugreen-nas.md](./docs/06-ugreen-nas.md)
   - Linux/macOS： [docs/02-home-path.md](./docs/02-home-path.md)
3. 填写 `home/xiao_config.yaml` 后启动（Windows 也可用 Python 直接跑 `xiaogpt`）

```bash
cd home
cp xiao_config.yaml.example xiao_config.yaml
# 编辑 xiao_config.yaml；若用 Docker 还需准备 mi.token（见 NAS 文档）
docker compose up -d
```

### 路径 B（官方技能后端）

```bash
cd backend
cp .env.example .env
# 编辑 .env 填入 LLM_API_KEY 等

python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

健康检查：

```bash
curl http://127.0.0.1:8080/health
```

更多： [docs/03-official-skill.md](./docs/03-official-skill.md)

## 开发与测试

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest -q
```

## 重要说明

1. **不能**把当前 Cursor 对话直接当成小爱 7×24 大脑；需要你的常开服务 + LLM API。
2. 路径 A 基于社区开源能力，非小米官方，存在失效风险。
3. 请勿把密钥、cookie、密码提交到 Git。
