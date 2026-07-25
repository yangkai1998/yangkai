# 你接下来要做的事（最短路径）

## 当前进度

- [x] DeepSeek API Key 已申请（模型：`deepseek-v4-flash`，余额约 10 元）
- [ ] 在常开设备部署
- [ ] 获取音箱 DID
- [ ] 填写本地配置并启动
- [ ] 音箱联调

## 安全提醒（先做）

你刚才把完整 Key 写进了仓库示例文件。虽然我已清掉且**未提交到 GitHub**，但建议你现在就去 DeepSeek 控制台：

1. 打开 https://platform.deepseek.com/api_keys
2. **删除/作废旧 Key**
3. **新建一把新 Key**
4. 只把新 Key 粘贴到本机的 `home/xiao_config.yaml`（不要发到聊天里，不要写进 `.example`）

## 下一步（按顺序）

### 1. 准备常开设备

家里电脑或 NAS，安装 Docker（或 Python 3.10+）。

### 2. 获取音箱 DID

```bash
pip install -U miservice_fork
export MI_USER='你的小米账号'
export MI_PASS='你的密码'
micli list
```

记下音箱对应的 DID；型号可用：

```bash
micli mina
```

### 3. 填写本地配置（密钥只放这里）

```bash
cp home/xiao_config.yaml.example home/xiao_config.yaml
```

编辑 `home/xiao_config.yaml`，至少填：

```yaml
hardware: 你的型号
account: "小米账号"
password: "密码"
mi_did: "音箱DID"
openai_key: "sk-你的新密钥"
api_base: "https://api.deepseek.com/v1"
gpt_options:
  model: "deepseek-v4-flash"
```

### 4. 启动

```bash
cd home
docker compose up -d
docker compose logs -f
```

### 5. 对音箱说

「小爱同学，问助手，明天适合晾衣服吗」

成功标准：音箱播报智能短答。

## 详细说明

- 总计划：`PLAN.md`
- 居家路径：`docs/02-home-path.md`
- 排错：`docs/04-troubleshooting.md`
