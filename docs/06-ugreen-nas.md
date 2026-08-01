# 绿联 NAS：把小爱桥接从 Windows 迁过去

可以。绿联 NAS（UGOS / UGOS Pro）只要装了 **Docker**，就能 7×24 跑 xiaogpt，音箱继续说「问助手」，由 NAS 上的容器去问 DeepSeek 再 TTS 播报。

> 音箱本身不用「挂载」到 NAS；是 **桥接程序挂到 NAS**，通过小米云端监听你的音箱对话。

---

## 选哪条路

| 方案 | 适合 | 说明 |
|------|------|------|
| **A. 迁移（推荐）** | Windows 上已经跑通 | 拷配置 + `.mi.token` 到 NAS，Docker 启动 |
| **B. 在 NAS 重装** | 想干净重来 / 没有 Windows 配置 | NAS 上新建配置；登录仍建议用 Windows 生成的 token |

两条路最终都是：**NAS Docker 里常驻一个 `xiaogpt` 容器**。  
**不要同时在 Windows 和 NAS 上跑两套**，会抢同一台音箱的对话。

---

## 方案 A：从 Windows 迁移（推荐）

### A1. Windows 上先停掉旧程序

1. 关掉正在跑的 `run_xiaogpt_cached.py` / PowerShell 窗口  
2. 若有桌面快捷方式「启动小爱DeepSeek」，暂时不要再点

### A2. 准备两个文件

在 Windows 找到：

| 文件 | 常见路径 | 拷到 NAS 后的名字 |
|------|----------|-------------------|
| 配置 | `C:\Users\你的用户名\xiaoai-setup\xiao_config.yaml` | `xiao_config.yaml` |
| 登录缓存 | `C:\Users\你的用户名\.mi.token` | `mi.token`（去掉开头的点，方便在 NAS 文件管理器里看见） |

也可用本仓库模板重新写一份配置（见下方「配置要点」），但 **token 尽量复用已验证过的**，少踩小米风控。

拷贝方式任选：

- 绿联文件管理器：共享文件夹上传  
- U 盘 / 局域网共享  
- 绿联手机 App 上传到例如 `docker/xiaogpt/`

**不要**把这两个文件发到微信群、公开网盘或 GitHub。

### A3. 绿联 NAS 安装 Docker

1. 登录绿联系统桌面  
2. 应用中心安装并打开 **Docker**  
3. （可选）Docker → 设置 → 配置国内镜像加速，避免拉不动 `yihong0618/xiaogpt`

### A4. 放好目录

建议目录（名称可自定，下面以它为例）：

```text
/volume1/docker/xiaogpt/          # 实际路径以你 NAS 共享名为准
  ├── docker-compose.yml
  ├── xiao_config.yaml
  └── mi.token
```

把仓库里的 `home/docker-compose.yml` 内容保存为同目录下的 `docker-compose.yml`。

确认 compose 里挂载类似：

```yaml
volumes:
  - ./xiao_config.yaml:/config/xiao_config.yaml:ro
  - ./mi.token:/root/.mi.token:ro
```

### A5. 用「项目」一键部署

1. Docker → **项目** → **创建**  
2. 项目名：`xiaogpt`（或 `yangkai-xiaogpt`）  
3. 存放路径选到你放了三个文件的目录（或粘贴 compose 内容）  
4. 点 **立即部署**，等待拉取镜像  
5. 看容器日志，出现轮询/监听类字样即正常

### A6. 验收

对着音箱说：

```text
小爱同学，问助手，今天适合吃什么？
```

- NAS 容器日志里能看到问句与 DeepSeek 回复  
- 音箱播报大模型答案（前面可能仍有 1～2 秒原厂小爱，属正常）

成功后：**Windows 上不要再启动 xiaogpt**。

---

## 方案 B：在绿联 NAS 上重新安装

适合没有旧配置，或想按模板重来。

### B1. 登录 token（仍建议在 Windows 做）

小米对脚本登录风控很严，NAS 里直接账号密码登录经常失败。推荐：

1. 继续用你已有的 Windows 流程生成 `C:\Users\...\ .mi.token`  
   （见 `docs/05-xiaomi-login-fix.md`）  
2. 拷到 NAS 改名为 `mi.token`

若 Windows 环境没了：在任意能登录小米的电脑生成 token 再拷过来即可。

### B2. 新建配置

复制 `home/xiao_config.yaml.example` 为 `xiao_config.yaml`，至少填写：

```yaml
hardware: LX06
account: "你的小米ID数字"
password: ""
mi_did: "你的音箱DID"
openai_key: "sk-你的DeepSeek密钥"
api_base: "https://api.deepseek.com/v1"
gpt_options:
  model: "deepseek-v4-flash"
  temperature: 0.7
  extra_body:
    thinking:
      type: disabled
mute_xiaoai: true
stream: true
verbose: false
```

DID 你之前已经拿到过（例如 `795940378`），可直接填；不必在 NAS 上再跑 `micli`。

### B3. 部署

同方案 A 的 A3～A6：放三个文件 → Docker 项目部署 → 语音验收。

---

## 配置要点（NAS 版）

1. **`password` 可留空**：有 `mi.token` 即可  
2. **`verbose: false`**：避免日志里打出 API Key  
3. **DeepSeek V4 必须关 thinking**（见 example 里的 `extra_body`）  
4. **keyword 保留 ASR 误听变体**（问助手 / 搵助手 等）  
5. NAS 一般不需要 Windows 那套 DNS 补丁

---

## 日常维护

| 操作 | 怎么做 |
|------|--------|
| 开机自启 | compose 已设 `restart: unless-stopped`，NAS 重启后容器会起来 |
| 看日志 | Docker → 容器 `yangkai-xiaogpt` → 日志 |
| 更新镜像 | 项目里重新拉取 `yihong0618/xiaogpt:latest` 后重建 |
| token 失效 | Windows 重新登录生成 `.mi.token`，覆盖 NAS 的 `mi.token`，重启容器 |
| 换 DeepSeek Key | 改 `xiao_config.yaml` 后重启容器 |

---

## 常见问题

### 1) 镜像拉取失败

Docker 设置里加镜像加速；或电脑能拉镜像时 `docker pull yihong0618/xiaogpt:latest` 再导入 NAS。

### 2) 容器一直 Login failed

- 确认 `mi.token` 已挂载到容器内 `/root/.mi.token`  
- 确认 Windows 上旧 xiaogpt 已停  
- 重新在 Windows 生成 token 再覆盖

### 3) 日志有答案但音箱不播

LX06 一般不用 `use_command`。可临时在配置里加 `use_command: true` 试一次，改完重启容器。

### 4) NAS 不支持 `network_mode: host`

本仓库 compose **默认用 bridge**，绿联通常可直接用。只有 bridge 异常时再试 host。

### 5) 资源占用

xiaogpt 很轻（轮询 + 调 API），一般 **内存几百 MB 内**；不在 NAS 上跑大模型本体。

---

## 迁移检查清单

- [ ] Windows 上的 xiaogpt 已停止  
- [ ] `xiao_config.yaml` 已拷到 NAS（含正确 DID / Key / keyword）  
- [ ] `.mi.token` 已改名为 `mi.token` 并挂载  
- [ ] Docker 项目已启动且日志正常  
- [ ] 「问助手」语音验收通过  
- [ ] 确认以后只在 NAS 上跑这一套  
