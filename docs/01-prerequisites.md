# 准备工作清单

按勾选推进，做完再进入路径部署。

## 设备与网络

- [ ] 有小爱音箱，且已绑定小米账号
- [ ] 有一台家里常开设备（电脑 / **绿联等 NAS** / 树莓派）
- [ ] 常开设备能访问大模型 API 地址
- [ ] 已安装 Docker，或 Python 3.10+（NAS 优先 Docker，见 [06-ugreen-nas.md](./06-ugreen-nas.md)）

## 账号与密钥

- [ ] 已申请大模型 API Key（推荐 DeepSeek / 通义 / Moonshot）
- [ ] 记下：
  - `LLM_API_KEY`
  - `LLM_BASE_URL`（需含 `/v1`）
  - `LLM_MODEL`
- [ ] 知道音箱型号（底部贴纸）
- [ ] 知道小米账号与密码（或准备抓 cookie）

## 安全提醒

1. **不要把** API Key、小米密码、cookie **提交到 Git**
2. 仓库里只保留 `.env.example` / `*.yaml.example`
3. 正式使用请设置 `SKILL_SHARED_TOKEN`（官方技能路径）
4. 居家桥接尽量只用局域网设备，不要把小米 cookie 传到不可信机器

## 推荐采购/注册顺序

1. 先申请 LLM Key（没有 Key 后面都测不了）
2. 再在常开设备装 Docker
3. 最后拿音箱 DID 并启动服务
