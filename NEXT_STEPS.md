# 你接下来要做的事（最短路径）

按顺序做，做完第一项再做下一项。

## 今天就能完成

1. **申请 LLM API Key**（推荐 DeepSeek）
   - 拿到：`API Key` / `Base URL` / `Model`
2. **准备常开设备**（家里电脑或 NAS），安装 Docker
3. **获取音箱 DID**
   ```bash
   pip install -U miservice_fork
   export MI_USER='小米账号'
   export MI_PASS='密码'
   micli list
   ```
4. **复制并填写配置**
   ```bash
   cp home/xiao_config.yaml.example home/xiao_config.yaml
   # 填 hardware / account / password / mi_did / openai_key / api_base
   ```
5. **启动**
   ```bash
   cd home && docker compose up -d && docker compose logs -f
   ```
6. **对音箱说**
   - 「小爱同学，问助手，明天适合晾衣服吗」
   - 成功：音箱播报智能短答

## 稳定以后可选

- 做官方技能路径：见 `docs/03-official-skill.md`
- 配 Cloudflare Tunnel + 本仓库 `backend`

## 详细说明

- 总计划：`PLAN.md`
- 准备工作：`docs/01-prerequisites.md`
- 居家路径：`docs/02-home-path.md`
- 排错：`docs/04-troubleshooting.md`
