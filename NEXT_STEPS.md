# 你接下来要做的事（最短路径）

## 当前进度

- [x] DeepSeek API Key 已申请（模型：`deepseek-v4-flash`，余额约 10 元）
- [x] 音箱型号确认：`LX06`
- [x] 运行环境确认：家里 Windows 电脑 + Python
- [x] 网页可登录小米，但 `micli list` 报 Login failed（风控）
- [ ] 配置写到正确文件：`home/xiao_config.yaml`（不是 `.example`）
- [ ] 用小米 ID + `micli play` / Cookie 绕过风控，拿到 DID
- [ ] 启动 xiaogpt 并联调音箱

## 安全提醒（先做）

1. **密钥只写 `home/xiao_config.yaml`，千万别写 `.example`**
2. 如果 Key/Cookie 曾写进 example 或发到聊天：去 DeepSeek 删旧 Key 并新建；小米建议改密
3. 不要把完整 Cookie / Key 发到聊天

## 下一步（先做这个）

见：`docs/05-xiaomi-login-fix.md`

```powershell
$env:MI_USER = "你的小米ID数字"
$env:MI_PASS = "你的密码"
micli play
micli list
```

成功后把音箱 `did` 填进 `home/xiao_config.yaml`，再启动：

```powershell
python -m pip install -U "xiaogpt[locked]"
xiaogpt --config home\xiao_config.yaml --use_chatgpt_api --mute_xiaoai --stream
```

## 详细说明

- 登录失败专页：`docs/05-xiaomi-login-fix.md`
- Windows 专版：`docs/02-home-path-windows.md`
- 总计划：`PLAN.md`
