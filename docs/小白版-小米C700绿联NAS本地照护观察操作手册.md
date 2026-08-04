# 小米 C700 + 绿联 DH4300P 本地照护观察

## 小白版操作手册

**适用设备：** 绿联 DH4300P（RK3588C、8 GB 内存）  
**适用系统：** UGOS Pro 1.18.0.0093  
**摄像头：** 小米 C700，先配置一路  
**文档版本：** 1.0（2026-08-04）

---

## 开始前先看这一页

### 这份手册能帮你完成什么

照着本手册操作，可以完成：

1. 在 NAS 上建立分析服务需要的文件夹；
2. 保证分析服务只能读取原录像，不能删除原录像；
3. 设置 163 邮箱授权码；
4. 用 Docker 检查录像目录和写入目录是否配置正确；
5. 为后续安装本地分析程序做好准备；
6. 了解日报、告警、保留期限和日常检查方法。

### 当前不能直接完成什么

目前只有部署与安全配置文档，**还没有可安装的本地分析程序或 ARM64 Docker 镜像**。因此，完成本手册第 1～6 步后，只能证明 NAS、目录和邮箱已经准备好；还不能自动识别哭声、生成育儿日报。

不要随便从网上找一个“AI 监控”镜像代替，因为它可能：

- 不支持 DH4300P 的 ARM64 处理器；
- 把儿童视频上传到第三方服务器；
- 不能关闭成人对话转录；
- 获得原始录像的删除权限；
- 在 NAS 上占满 CPU、内存或磁盘。

看到本文中的“停止点”后先停下，等本地分析程序及其 Docker 配置准备好，再继续正式部署。

### 重要安全提醒

- 本方案分析的是已写入完成的 MP4，不是实时画面。
- 按现有录像每段约 7 分钟计算，告警至少延迟约 7 分钟，通常还会更久。
- 告警只能表示“建议查看录像”，不能代替成人看护、婴儿监护器、急救或医疗判断。
- 不要把 NAS 的 445、22、80、443 等端口直接映射到公网。
- 不要把 NAS 密码、163 邮箱授权码发给任何人。

---

# 第一部分：准备工作

## 第 1 步：确认现有录像

1. 在电脑浏览器中登录绿联 NAS。
2. 打开桌面上的 **文件管理**。
3. 依次进入：

   ```text
   小米摄像机
   └── XiaomiCamera_00_B88880639745
   ```

4. 打开一个日期目录，确认能看到类似文件：

   ```text
   00_20260722162847_20260722163601.mp4
   ```

5. 随便双击一段已经录完的 MP4：
   - 能正常播放画面；
   - 能听到声音；
   - 拖动进度条不会报错。

6. 右键 `XiaomiCamera_00_B88880639745` 文件夹，选择 **属性**。
7. 在“位置”或路径信息中确认真实路径是：

   ```text
   /volume2/小米摄像机/XiaomiCamera_00_B88880639745
   ```

如果路径不同，以 NAS 属性页面显示的路径为准，并在后面所有配置中替换。

### 本步完成标准

- [ ] 能看到 MP4 文件；
- [ ] 抽查的视频有画面、有声音；
- [ ] 已确认录像目录的真实路径。

---

## 第 2 步：确认 Docker 共享文件夹在哪个存储空间

安装 Docker 后，绿联系统一般会自动建立 `docker` 共享文件夹。

1. 打开 **文件管理**。
2. 在左侧“共享文件夹”中找到 `docker`。
3. 右键 `docker`，选择 **属性**。
4. 查看“位置”或“存储位置”。
5. 确认真实路径是否为：

   ```text
   /volume2/docker
   ```

如果显示的是 `/volume1/docker`，后文所有 `/volume2/docker` 都要改为 `/volume1/docker`。不要根据录像位于 `volume2` 就猜测 Docker 也一定在 `volume2`。

### 本步完成标准

- [ ] 已记录 Docker 共享文件夹真实路径：`________________________`

---

## 第 3 步：创建工作文件夹

以下示例假定 Docker 路径是 `/volume2/docker`。

1. 在 **文件管理** 中进入 `docker` 共享文件夹。
2. 点击顶部的 **新建文件夹**，创建：

   ```text
   baby-monitor
   ```

3. 进入 `baby-monitor`。
4. 依次创建 6 个子文件夹，名称必须全部使用小写英文：

   ```text
   config
   state
   reports
   events
   logs
   secrets
   ```

完成后应当是：

```text
/volume2/docker/baby-monitor/
├── config
├── state
├── reports
├── events
├── logs
└── secrets
```

各文件夹用途：

| 文件夹 | 用途 | 可以手工删除吗 |
| --- | --- | --- |
| `config` | 普通配置文件 | 不建议 |
| `state` | 记录哪些录像已分析 | 不建议 |
| `reports` | 每日照护报告 | 可以删除过期报告 |
| `events` | 需要复核的短片段 | 可以删除过期片段 |
| `logs` | 故障排查日志 | 可以删除过期日志 |
| `secrets` | 163 邮箱授权信息 | 不要随意移动或分享 |

### 常见错误

- 文件夹建在了“小米摄像机”里面：错误，应建在 `docker/baby-monitor`。
- 名称写成中文：不推荐，后续复制配置更容易出错。
- 建成一个名为 `config/state/reports` 的文件夹：错误，应是 6 个独立文件夹。

### 本步完成标准

- [ ] `baby-monitor` 下能看到 6 个子文件夹；
- [ ] 所有名称拼写与上文一致。

---

## 第 4 步：准备 163 邮箱授权码

授权码相当于专门给程序使用的邮箱密码，不是网页登录密码。

1. 在电脑浏览器中打开 [https://mail.163.com](https://mail.163.com)。
2. 登录用于发送报告的 163 邮箱。
3. 点击页面上的 **设置**。
4. 进入 **POP3/SMTP/IMAP**。
5. 找到 SMTP 或 IMAP/SMTP 服务并开启。
6. 点击 **新增授权密码**（不同界面也可能叫“客户端授权密码”）。
7. 按网页提示完成手机验证。
8. 授权码通常只显示一次：
   - 先复制到密码管理器；
   - 不要截图；
   - 不要粘贴到聊天中；
   - 不要填写邮箱网页登录密码。

本方案使用：

```text
SMTP 服务器：smtp.163.com
端口：465
加密：SSL/TLS
用户名：完整邮箱地址，例如 example@163.com
密码：刚生成的客户端授权码
```

### 本步完成标准

- [ ] SMTP 服务已开启；
- [ ] 已生成并安全保存客户端授权码；
- [ ] 知道接收日报的邮箱地址。

---

# 第二部分：建立配置文件

## 第 5 步：在电脑上创建 `mail.env`

不要尝试创建 Word 文档。该文件必须是纯文本。

### Windows 操作

1. 打开“记事本”。
2. 复制下面的内容。
3. 替换其中 4 个尖括号占位内容。

```dotenv
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_TLS=true
SMTP_USER=<发送邮件的完整163邮箱地址>
SMTP_PASSWORD=<163客户端授权码>
MAIL_FROM=<发送邮件的完整163邮箱地址>
MAIL_TO=<接收报告的邮箱地址>
TZ=Asia/Shanghai
```

示例仅用于说明格式，不要照抄：

```dotenv
SMTP_USER=example@163.com
SMTP_PASSWORD=这里应当是授权码
MAIL_FROM=example@163.com
MAIL_TO=receiver@example.com
```

4. 点击“文件”→“另存为”。
5. 文件名填写：

   ```text
   mail.env
   ```

6. “保存类型”选择 **所有文件**。
7. 编码选择 **UTF-8**。
8. 保存后确认文件不是 `mail.env.txt`。

如果 Windows 隐藏扩展名：

1. 打开文件资源管理器；
2. 点击“查看”；
3. 开启“文件扩展名”；
4. 确保最终名称正好是 `mail.env`。

### 上传到 NAS

1. 回到 NAS 的 **文件管理**。
2. 进入：

   ```text
   docker/baby-monitor/secrets
   ```

3. 点击 **上传**，选择刚创建的 `mail.env`。
4. 上传后不要预览或截图文件内容。

最终位置应为：

```text
/volume2/docker/baby-monitor/secrets/mail.env
```

### 本步完成标准

- [ ] 文件名是 `mail.env`，不是 `mail.env.txt`；
- [ ] 文件位于 `secrets` 文件夹；
- [ ] 使用的是授权码，不是邮箱登录密码。

---

## 第 6 步：创建不含密码的基础配置

在电脑记事本中创建 `settings.env`，内容如下：

```dotenv
TZ=Asia/Shanghai
SOURCE_DIR=/media/source
REPORT_TIME=18:00
REPORT_START=00:00
REPORT_END=18:00
FILE_STABLE_MINUTES=10
SCAN_INTERVAL_MINUTES=5
BASELINE_DAYS=7
CRY_ALERT_MINUTES=10
NO_VISIBLE_RESPONSE_MINUTES=15
EVENT_RETENTION_DAYS=30
REPORT_RETENTION_DAYS=90
LOG_RETENTION_DAYS=30
ENABLE_ALERTS=false
ENABLE_SPEECH_TRANSCRIPTION=false
```

保存注意事项：

- 文件名必须是 `settings.env`；
- 保存类型选“所有文件”；
- 编码选 UTF-8；
- 不要改动等号左边的名称；
- 前 7 天保持 `ENABLE_ALERTS=false`。

把它上传到：

```text
/volume2/docker/baby-monitor/config/settings.env
```

### 本步完成标准

- [ ] `config` 里有 `settings.env`；
- [ ] `secrets` 里有 `mail.env`；
- [ ] `ENABLE_ALERTS=false`；
- [ ] `ENABLE_SPEECH_TRANSCRIPTION=false`。

---

# 第三部分：先检查目录，暂不安装分析程序

## 第 7 步：创建一次性“目录检查”Docker 项目

这个项目只检查：

- 容器能否看到录像；
- 原录像是否为只读；
- 工作目录能否写入。

它不会分析、上传或删除视频。检查结束后容器会正常停止，这是预期行为。

### 7.1 打开项目创建页面

1. 打开 NAS 桌面上的 **Docker**。
2. 点击左侧 **项目**。
3. 点击 **创建**。
4. 项目名称填写：

   ```text
   baby-monitor-check
   ```

5. 存放路径可以使用系统自动生成的路径。
6. 选择 Web 编辑器或 Compose 配置输入区域。

### 7.2 粘贴检查配置

先确认下面两处 `/volume2` 与你在第 1、2 步确认的真实路径一致。

```yaml
services:
  check:
    image: alpine:latest
    container_name: baby-monitor-check
    restart: "no"
    volumes:
      - /volume2/小米摄像机/XiaomiCamera_00_B88880639745:/media/source:ro
      - /volume2/docker/baby-monitor/state:/work/state
      - /volume2/docker/baby-monitor/reports:/work/reports
      - /volume2/docker/baby-monitor/events:/work/events
      - /volume2/docker/baby-monitor/logs:/work/logs
    command:
      - /bin/sh
      - -c
      - |
        set -eu
        echo "1/4 检查录像目录"
        test -d /media/source
        echo "2/4 查找 MP4"
        MP4_COUNT=$$(find /media/source -type f -name '*.mp4' | wc -l)
        echo "找到 MP4 数量: $$MP4_COUNT"
        test "$$MP4_COUNT" -gt 0
        echo "3/4 检查原录像只读"
        if touch /media/source/不应创建此文件 2>/dev/null; then
          rm -f /media/source/不应创建此文件
          echo "错误：录像目录不是只读"
          exit 1
        fi
        echo "4/4 检查工作目录写入"
        date > /work/state/write-test.txt
        date > /work/reports/write-test.txt
        date > /work/events/write-test.txt
        date > /work/logs/write-test.txt
        echo "全部检查通过"
```

注意：

- `:ro` 表示只读，不能删除；
- 不要删掉录像路径末尾的 `:ro`；
- YAML 对空格敏感，不要手工调整缩进；
- 配置中没有 `ports:`，因此不会开放网页端口。

### 7.3 启动检查

1. 点击 **立即部署**。
2. 第一次会下载 `alpine` 镜像，请等待下载完成。
3. 打开项目或容器的 **日志**。
4. 正常结果应看到：

   ```text
   1/4 检查录像目录
   2/4 查找 MP4
   找到 MP4 数量: 大于0的数字
   3/4 检查原录像只读
   4/4 检查工作目录写入
   全部检查通过
   ```

5. 容器随后显示“已停止”或退出码 `0`，表示任务完成，并不是故障。

### 7.4 在文件管理中复查

分别打开 `state`、`reports`、`events`、`logs`，每个目录都应有：

```text
write-test.txt
```

录像目录中不应出现“不应创建此文件”。

确认无误后，可以删除 `baby-monitor-check` 项目及其容器；不要勾选删除主机上的原始数据。

### 失败时怎么处理

#### 日志显示找不到录像目录

- 检查是否把 `/volume1`、`/volume2` 写错；
- 检查中文目录名是否完全一致；
- 检查摄像头编号 `XiaomiCamera_00_B88880639745` 是否写错。

#### 日志显示找到 MP4 数量为 0

- 确认 MP4 是否位于更深的日期子目录；
- 确认扩展名是否为小写 `.mp4`；
- 确认容器有读取“小米摄像机”共享文件夹的权限。

#### 日志显示 Permission denied

- 优先确认工作目录位于系统自动建立的 `docker` 共享文件夹；
- 在文件管理中右键目标文件夹→“属性”→“权限”，确认管理员具有读写权限；
- 不要直接把所有目录权限改成 `777`。

#### 日志显示无法拉取镜像

- 检查 NAS 是否能正常访问互联网；
- 在 Docker 的“镜像”页面查看下载状态；
- 稍后重试，不要连续创建多个相同项目。

### 本步完成标准

- [ ] 日志显示“全部检查通过”；
- [ ] 四个目录各有一个 `write-test.txt`；
- [ ] 原录像目录保持只读；
- [ ] 检查项目已删除或保持停止状态。

---

# 第四部分：邮件发送测试

## 第 8 步：创建 SMTP 测试脚本

在电脑记事本中创建 `smtp_test.py`，复制以下内容：

```python
import os
import smtplib
import ssl
from email.message import EmailMessage

required = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "MAIL_FROM",
    "MAIL_TO",
]
missing = [name for name in required if not os.environ.get(name)]
if missing:
    raise SystemExit("缺少配置：" + ", ".join(missing))

message = EmailMessage()
message["Subject"] = "宝宝照护观察：SMTP 测试成功"
message["From"] = os.environ["MAIL_FROM"]
message["To"] = os.environ["MAIL_TO"]
message.set_content(
    "这是一封测试邮件。收到它表示 NAS 可以通过 163 SMTP 发送报告。"
)

context = ssl.create_default_context()
with smtplib.SMTP_SSL(
    os.environ["SMTP_HOST"],
    int(os.environ["SMTP_PORT"]),
    context=context,
    timeout=30,
) as smtp:
    smtp.login(os.environ["SMTP_USER"], os.environ["SMTP_PASSWORD"])
    smtp.send_message(message)

print("SMTP 测试邮件发送成功")
```

保存为 UTF-8 纯文本，文件名必须是 `smtp_test.py`，然后上传到：

```text
/volume2/docker/baby-monitor/config/smtp_test.py
```

## 第 9 步：创建一次性“邮件测试”项目

1. 打开 Docker→**项目**→**创建**。
2. 项目名称填写：

   ```text
   baby-monitor-mail-test
   ```

3. 粘贴下面的 Compose 配置：

```yaml
services:
  mail-test:
    image: python:3-alpine
    container_name: baby-monitor-mail-test
    restart: "no"
    env_file:
      - /volume2/docker/baby-monitor/secrets/mail.env
    volumes:
      - /volume2/docker/baby-monitor/config/smtp_test.py:/app/smtp_test.py:ro
    command: ["python", "/app/smtp_test.py"]
```

如果 Docker 工作目录实际在 `/volume1/docker`，要修改上面的两处 `/volume2/docker`。

4. 点击 **立即部署**。
5. 打开日志。
6. 正常日志是：

   ```text
   SMTP 测试邮件发送成功
   ```

7. 查看收件箱和垃圾邮件文件夹。
8. 收到邮件后，删除 `baby-monitor-mail-test` 项目。

### 邮件测试常见问题

#### 显示认证失败或密码错误

- 确认 `SMTP_PASSWORD` 是客户端授权码，不是网页登录密码；
- 确认 `SMTP_USER` 是完整邮箱地址；
- 重新生成授权码后更新 `mail.env`；
- 检查等号后面是否多了空格、中文引号或尖括号。

#### 显示连接超时

- 检查 NAS 的互联网连接；
- 检查路由器是否拦截 465 端口；
- 暂时不要反复尝试，以免触发邮箱安全限制。

#### 日志成功但没收到邮件

- 查看垃圾邮件；
- 核对 `MAIL_TO`；
- 登录 163 网页邮箱查看“已发送”或安全提醒。

### 本步完成标准

- [ ] 日志显示发送成功；
- [ ] 收件邮箱实际收到测试邮件；
- [ ] 邮件测试项目已删除或停止。

---

# 第五部分：正式分析程序的安装停止点

## 第 10 步：到这里先停止

当以下项目全部完成时，NAS 基础环境已经准备好：

- [ ] 原录像路径已确认；
- [ ] Docker 工作路径已确认；
- [ ] 6 个工作目录已创建；
- [ ] `settings.env` 已上传；
- [ ] `mail.env` 已上传；
- [ ] 目录检查全部通过；
- [ ] SMTP 测试邮件已收到。

**现在先不要自己创建正式的 `baby-monitor` 分析项目。**

正式部署还需要以下交付物：

1. 支持 Linux ARM64 的本地分析镜像；
2. 明确版本的 `docker-compose.yml`；
3. 镜像校验值或可信镜像仓库；
4. 哭声检测模型；
5. 人物与活动候选检测模型；
6. 日报生成和 18:00 定时任务；
7. 事件片段及报告自动清理任务；
8. 禁止云端上传和禁止语音转录的验证方法。

没有这些交付物时，任何“正式项目配置”都只是空壳，不能生成真实分析报告。

---

# 第六部分：正式程序交付后的操作顺序

拿到经过检查的正式镜像和 Compose 文件后，按以下顺序操作：

1. 在 Docker→**项目**→**创建**；
2. 项目名使用 `baby-monitor`；
3. 粘贴正式 Compose 配置；
4. 再次核对录像挂载末尾是 `:ro`；
5. 核对没有不认识的公网地址或视频上传参数；
6. 核对 CPU 上限不超过 4 核、内存上限不超过 4 GB；
7. 点击立即部署；
8. 先只分析一段历史录像；
9. 检查报告时间戳是否准确；
10. 运行 7 天基线期，保持告警关闭；
11. 人工核对误报和漏报；
12. 基线可接受后，才把 `ENABLE_ALERTS` 改为 `true`；
13. 每次修改后只重新部署同一个项目，不要创建重复项目。

建议的资源上限：

```yaml
deploy:
  resources:
    limits:
      cpus: "4.0"
      memory: 4G
```

正式项目不需要向公网开放端口。若后续增加本地网页，应只在家庭局域网访问，且不得在路由器中设置公网端口映射。

---

# 第七部分：7 天基线与正式告警

## 前 7 天怎么做

每天 18:00 后：

1. 打开当天报告；
2. 随机抽查至少 3 个事件时间戳；
3. 比较报告与原录像；
4. 记录：
   - 把电视声音误判为哭声的次数；
   - 有哭声但没有识别到的次数；
   - 成人在画面中却没有识别到的次数；
   - 瓶喂或哄睡时段是否基本合理。

宝宝当前家庭基线：

```text
月龄：5个半月
喂养：母乳瓶喂，约每3小时一次
睡眠：约每2～3小时需要哄睡
```

这些只是家庭节律，不是医疗标准。系统不得因为某次没有拍到瓶喂，就断定宝宝没有进食。

## 正式告警建议

基线准确性可接受后，先只启用：

```text
连续哭声候选：至少10分钟
```

再观察一周。如果误报仍少，再考虑启用：

```text
哭声后15分钟未检测到成人进入画面
```

邮件必须使用“候选”“未检测到”“建议查看”等表达，不能写成“宝宝无人照护”等确定结论。

---

# 第八部分：存储清理

## 分析服务可以自动清理的内容

```text
events：保留30天
reports：保留90天
logs：保留30天
```

## 分析服务绝对不能清理的内容

```text
/volume2/小米摄像机/
```

原始录像的覆盖与清理应由小米录像功能或绿联 NAS 自带的存储策略完成。建议在容量使用达到约 85% 时开始清理最旧录像，避免磁盘完全写满。

首次设置自动删除前：

1. 找一段不重要的测试录像；
2. 确认规则只针对最旧录像；
3. 确认不会删除 `docker/baby-monitor`；
4. 确认 NAS 回收站是否会继续占用空间；
5. 检查一次实际删除结果。

不要把分析容器设置成对录像目录“读写”，即使这样配置更方便。

---

# 第九部分：日常使用

## 每天检查

- 18:00 后是否收到日报；
- 报告的录像覆盖是否到 18:00；
- 是否有“文件无法读取”；
- 告警是否能对应到真实录像。

## 每周检查

- Docker 项目是否在运行；
- CPU 是否长期高于约 80%；
- 内存是否持续接近上限；
- NAS 可用空间是否低于 15%；
- `events` 和 `reports` 是否按保留期清理。

## 遇到故障时

按顺序操作：

1. 不要删除原始录像；
2. 打开 Docker 项目日志；
3. 记录故障发生时间；
4. 保存日志中报错文字，但要遮住邮箱、授权码和私人路径；
5. 先重启分析容器，不要直接重启整个 NAS；
6. 仍然失败时再停止项目并排查。

---

# 第十部分：最终检查清单

## 安全

- [ ] SMB 445 端口没有映射到公网；
- [ ] 录像目录以 `:ro` 只读挂载；
- [ ] 成人谈话转录保持关闭；
- [ ] 邮箱授权码只存在 `secrets/mail.env`；
- [ ] 没有把密码或授权码发到聊天或截图；
- [ ] 分析服务没有配置云端视频上传地址。

## 功能

- [ ] 能读取 MP4；
- [ ] 能听到 MP4 中的音频；
- [ ] 工作目录写入测试通过；
- [ ] 163 测试邮件已收到；
- [ ] 时区为 `Asia/Shanghai`；
- [ ] 日报范围为当天 00:00～18:00；
- [ ] 日报计划时间为 18:00；
- [ ] 前 7 天告警关闭。

## 使用边界

- [ ] 家庭成员知道并同意相关分析；
- [ ] 不把自动结果当作医疗判断；
- [ ] 不把“未检测到”当作“没有发生”；
- [ ] 不依赖延迟告警处理紧急情况；
- [ ] 对照护者只做事实复盘，不做人格或能力评分。

---

## 附录：需要记下的信息

```text
录像真实路径：
____________________________________________________

Docker真实路径：
____________________________________________________

发送邮箱：
____________________________________________________

接收邮箱：
____________________________________________________

目录检查日期：
____________________________________________________

SMTP测试日期：
____________________________________________________

7天基线开始日期：
____________________________________________________

7天基线结束日期：
____________________________________________________
```

## 参考

- 绿联知识中心：容器映射目录权限问题  
  <https://support.ugnas.com/detail/article/zh-CN/356>
- 网易邮箱帮助中心：SMTP 与客户端授权密码  
  <https://help.mail.163.com/searchFAQ.do?m=search&word=smtp>

