# 你接下来要做的事（最短路径）

## 当前进度

- [x] DeepSeek API Key 已申请（模型：`deepseek-v4-flash`，余额约 10 元）
- [x] 音箱型号确认：`LX06`
- [x] 运行环境确认：家里 Windows 电脑
- [ ] 安装 Python（并勾选 PATH）
- [ ] 用 PowerShell 正确命令获取 DID
- [ ] 填写本地配置并启动
- [ ] 音箱联调

## 安全提醒（先做）

1. 如果小米密码出现在聊天/截图里：**立刻改小米账号密码**
2. DeepSeek Key 只放本机 `home/xiao_config.yaml`，不要发聊天、不要写进 `.example`

## 下一步（Windows PowerShell）

完整步骤见：`docs/02-home-path-windows.md`

最短命令：

```powershell
python --version
python -m pip install -U miservice_fork
$env:MI_USER = "你的小米账号"
$env:MI_PASS = "你的小米密码"
python -m micli list
```

拿到 DID 后，再填 `home/xiao_config.yaml`（`hardware: LX06`）并启动 `xiaogpt`。

## 详细说明

- Windows 专版：`docs/02-home-path-windows.md`
- 总计划：`PLAN.md`
- 排错：`docs/04-troubleshooting.md`
