# 你接下来要做的事（最短路径）

## 当前进度

- [x] DeepSeek API Key 已申请（模型：`deepseek-v4-flash`）
- [x] 音箱型号确认：`LX06`，DID 已拿到
- [x] Windows 上 xiaogpt 已联调通过（含 mute / keyword / token 缓存）
- [ ] （可选）迁到绿联 NAS，实现开机常驻、不用开 Windows

## 推荐下一步：迁到绿联 NAS

完整步骤见：**[docs/06-ugreen-nas.md](./docs/06-ugreen-nas.md)**

最短操作：

1. Windows 停掉正在跑的 xiaogpt  
2. 拷贝这两个文件到 NAS（例如 `docker/xiaogpt/`）：
   - `C:\Users\你的用户名\xiaoai-setup\xiao_config.yaml`
   - `C:\Users\你的用户名\.mi.token` → 改名为 `mi.token`
3. 同目录放入仓库 `home/docker-compose.yml`
4. 绿联 Docker → 项目 → 创建 → 部署
5. 说：「小爱同学，问助手，今天适合吃什么？」验收
6. 以后只在 NAS 上跑，Windows 不再启动

## 安全提醒

1. `xiao_config.yaml` / `mi.token` 含密钥，不要上传公开网盘或 GitHub  
2. 若 Key 曾泄露：去 DeepSeek 删旧 Key 并新建  

## 其他文档

- 绿联迁移/重装：`docs/06-ugreen-nas.md`
- 小爱抢话说明：`docs/04-troubleshooting.md`
- Windows 专版：`docs/02-home-path-windows.md`
- 登录风控：`docs/05-xiaomi-login-fix.md`
