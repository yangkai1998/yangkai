# 路径 A：居家本地桥接（推荐）

本路径不依赖小爱开放平台，适合「特定口令 + 音箱播报」。

底层使用成熟开源项目 [xiaogpt](https://github.com/yihong0618/xiaogpt)。本仓库提供针对你需求的配置模板与步骤。

> **绿联 NAS**：想 7×24 挂在 NAS 上，直接看 [06-ugreen-nas.md](./06-ugreen-nas.md)（含从 Windows 迁移步骤）。

## 1. 安装依赖并获取 DID

> 如果你是 **Windows PowerShell**，请直接看：  
> [02-home-path-windows.md](./02-home-path-windows.md)  
> （PowerShell 不能用 `export`，要用 `$env:MI_USER = "..."`）

Linux / macOS：

```bash
pip install -U miservice_fork
export MI_USER='你的小米账号'
export MI_PASS='你的密码'
micli list
```

记录音箱 DID，并查看型号：

```bash
micli mina
```

### 登录失败怎么办

小米常对「异地/脚本登录」风控。可选：

1. 换家庭宽带再试
2. 用 cookie 登录（手机/电脑登录小米账号后抓包）
3. 在能登录的机器生成 `.mi.token`，再拷到部署机器

## 2. 填写配置

```bash
cp home/xiao_config.yaml.example home/xiao_config.yaml
```

最少要改这些字段：

```yaml
hardware: LX06          # 你的型号
account: "..."
password: "..."
mi_did: "..."
openai_key: "sk-..."    # 只写进 xiao_config.yaml，不要写进 example
api_base: "https://api.deepseek.com/v1"
gpt_options:
  model: "deepseek-v4-flash"
keyword:
  - "问助手"
  - "问杨凯"
  - "帮我问"
```

## 3. 启动

### Docker（推荐）

```bash
cd home
docker compose up -d
docker compose logs -f
```

### 直接运行 xiaogpt

```bash
pip install -U "xiaogpt[locked]"
xiaogpt --config home/xiao_config.yaml --use_chatgpt_api --mute_xiaoai --stream
```

## 4. 怎么对音箱说话

触发大模型：

- 「小爱同学，问助手，明天适合晾衣服吗」
- 「小爱同学，问杨凯，怎么做番茄炒蛋」
- 「小爱同学，帮我问，三分钟拉伸动作」

不触发（保持原生小爱）：

- 「小爱同学，播放轻音乐」
- 「小爱同学，打开客厅灯」
- 「小爱同学，现在几点」

## 5. 型号兼容提示

以下型号经常需要：

```yaml
use_command: true
```

已知高概率需要：`LX04`、`X10A`、`L05B`、`L05C`  
表现：终端有 GPT 文本，但音箱不播。

## 6. 开机自启

Docker 已设置 `restart: unless-stopped`。  
若用 systemd，可自行写一个 service 调用 `docker compose up -d`。

## 7. 和本仓库 backend 的关系

- 路径 A **不强制**使用 `backend/`
- `backend/` 是给官方技能（路径 B）准备的
- 你也可以把 xiaogpt 的 `api_base` 指向任何 OpenAI 兼容网关
