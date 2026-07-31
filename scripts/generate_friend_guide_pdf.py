#!/usr/bin/env python3
"""Generate a shareable Chinese PDF guide for XiaoAi + DeepSeek setup."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
    "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
]


def register_font() -> str:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            # TTC needs subfontIndex on some systems; Droid TTF is safer.
            if path.endswith(".ttc"):
                pdfmetrics.registerFont(TTFont("CN", path, subfontIndex=0))
            else:
                pdfmetrics.registerFont(TTFont("CN", path))
            return "CN"
    raise SystemExit("No Chinese font found")


def build_styles(font: str):
    base = getSampleStyleSheet()
    styles = {
        "cover_title": ParagraphStyle(
            "cover_title",
            parent=base["Title"],
            fontName=font,
            fontSize=22,
            leading=30,
            alignment=TA_CENTER,
            spaceAfter=12,
            textColor=colors.HexColor("#1f2937"),
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub",
            parent=base["Normal"],
            fontName=font,
            fontSize=12,
            leading=18,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#4b5563"),
            spaceAfter=8,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontName=font,
            fontSize=16,
            leading=22,
            spaceBefore=14,
            spaceAfter=8,
            textColor=colors.HexColor("#111827"),
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName=font,
            fontSize=13,
            leading=18,
            spaceBefore=10,
            spaceAfter=6,
            textColor=colors.HexColor("#1f2937"),
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName=font,
            fontSize=10.5,
            leading=16,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
            textColor=colors.HexColor("#111827"),
        ),
        "bullet": ParagraphStyle(
            "bullet",
            parent=base["Normal"],
            fontName=font,
            fontSize=10.5,
            leading=16,
            leftIndent=0,
            spaceAfter=2,
        ),
        "note": ParagraphStyle(
            "note",
            parent=base["Normal"],
            fontName=font,
            fontSize=10,
            leading=15,
            backColor=colors.HexColor("#fff7ed"),
            borderPadding=6,
            spaceBefore=4,
            spaceAfter=8,
            textColor=colors.HexColor("#9a3412"),
        ),
        "code": ParagraphStyle(
            "code",
            fontName=font,
            fontSize=9,
            leading=13,
            backColor=colors.HexColor("#f3f4f6"),
            borderPadding=6,
            spaceBefore=4,
            spaceAfter=8,
            textColor=colors.HexColor("#111827"),
        ),
        "footer": ParagraphStyle(
            "footer",
            parent=base["Normal"],
            fontName=font,
            fontSize=8,
            textColor=colors.HexColor("#6b7280"),
            alignment=TA_CENTER,
        ),
        "table_cell": ParagraphStyle(
            "table_cell",
            fontName=font,
            fontSize=9,
            leading=13,
            alignment=TA_LEFT,
        ),
    }
    return styles


def p(text: str, style):
    return Paragraph(text.replace("\n", "<br/>"), style)


def bullets(items, style):
    flow = []
    for item in items:
        flow.append(ListItem(Paragraph(item, style), leftIndent=12, bulletColor=colors.HexColor("#374151")))
    return ListFlowable(
        flow,
        bulletType="bullet",
        start="•",
        leftIndent=16,
        bulletFontName=style.fontName,
        bulletFontSize=10,
    )


def code_block(text: str, style):
    return Preformatted(text.strip("\n"), style, maxLineLength=120)


def simple_table(rows, col_widths, cell_style):
    data = []
    for row in rows:
        data.append([Paragraph(str(c), cell_style) for c in row])
    table = Table(data, colWidths=col_widths, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e5e7eb")),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#111827")),
                ("FONTNAME", (0, 0), (-1, -1), cell_style.fontName),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
            ]
        )
    )
    return table


def add_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("CN", 8)
    canvas.setFillColor(colors.HexColor("#6b7280"))
    canvas.drawCentredString(
        A4[0] / 2,
        12 * mm,
        f"小爱音箱 + DeepSeek 安装操作手册  ·  第 {doc.page} 页  ·  请勿分享账号密码与 API Key",
    )
    canvas.restoreState()


def build_pdf(output: Path):
    font = register_font()
    styles = build_styles(font)
    doc = SimpleDocTemplate(
        str(output),
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.6 * cm,
        bottomMargin=1.8 * cm,
        title="小爱音箱接入 DeepSeek 操作手册",
        author="yangkai xiaoai bridge guide",
    )

    story = []

    # Cover
    story.append(Spacer(1, 2.2 * cm))
    story.append(p("小爱音箱接入 DeepSeek<br/>安装与使用操作手册", styles["cover_title"]))
    story.append(Spacer(1, 0.4 * cm))
    story.append(p("给朋友的可转发版（基于实测联调记录整理）", styles["cover_sub"]))
    story.append(p("适用：小米小爱音箱（如 LX06）+ Windows 10/11<br/>可选进阶：绿联 NAS Docker 7×24 常驻", styles["cover_sub"]))
    story.append(Spacer(1, 0.6 * cm))
    story.append(
        p(
            "核心效果：对音箱说「小爱同学，问助手，……」后，"
            "由 DeepSeek 回答，并用音箱语音播报。"
            "不带口令时，仍走原生小爱（播音乐、控灯等）。",
            styles["body"],
        )
    )
    story.append(
        p(
            "重要：本文不含任何真实账号、密码、Cookie、API Key。"
            "请朋友使用自己的小米账号和 DeepSeek Key。",
            styles["note"],
        )
    )
    story.append(PageBreak())

    # 1
    story.append(p("一、这是什么？原理一句话", styles["h1"]))
    story.append(
        p(
            "家里常开一台电脑（或 NAS），运行开源桥接程序 xiaogpt。"
            "它通过小米云端监听音箱对话；当你说带触发词的问题（如「问助手」），"
            "程序把问题发给 DeepSeek，再把答案用音箱 TTS 播出来。",
            styles["body"],
        )
    )
    story.append(
        bullets(
            [
                "不需要刷机、不需要 root",
                "不依赖小爱开放平台（可选官方技能是另一条路）",
                "音箱本身不用「安装 DeepSeek」；是桥接服务在电脑/NAS 上运行",
            ],
            styles["bullet"],
        )
    )

    # 2
    story.append(p("二、开始前准备清单", styles["h1"]))
    story.append(
        simple_table(
            [
                ["项目", "说明"],
                ["小爱音箱", "已绑定小米账号；型号看底部贴纸（本文以 LX06 为例）"],
                ["Windows 电脑", "Win10/11，能上网；建议家里常开，或后续迁到 NAS"],
                ["Python 3.12+", "安装时勾选 Add python.exe to PATH"],
                ["小米 ID", "用数字 ID，不要只用手机号"],
                ["DeepSeek API Key", "官网申请；模型建议 deepseek-v4-flash 或 deepseek-v4-pro"],
                ["网络提示", "装软件时可开代理；小米登录/调用时建议关 Clash 系统代理"],
            ],
            [3.2 * cm, 13.5 * cm],
            styles["table_cell"],
        )
    )
    story.append(Spacer(1, 0.3 * cm))
    story.append(
        p(
            "安全红线：小米密码、.mi.token、DeepSeek Key 不要发微信、不要截图发群、不要上传公开网盘。",
            styles["note"],
        )
    )

    # 3
    story.append(p("三、Windows 最短安装流程（推荐）", styles["h1"]))
    story.append(p("3.1 安装 Python", styles["h2"]))
    story.append(
        bullets(
            [
                "打开 https://www.python.org/downloads/ 下载 Windows 版",
                "安装时务必勾选 Add python.exe to PATH",
                "装完后关闭并重新打开 PowerShell",
                "验证：python --version   与   python -m pip --version",
            ],
            styles["bullet"],
        )
    )

    story.append(p("3.2 一键安装脚本（拿 DID / 装依赖）", styles["h2"]))
    story.append(
        p(
            "在 PowerShell 执行（会创建目录并下载脚本）：",
            styles["body"],
        )
    )
    story.append(
        code_block(
            """New-Item -ItemType Directory -Force "$HOME\\xiaoai-setup" | Out-Null
Invoke-WebRequest `
  "https://raw.githubusercontent.com/yangkai1998/yangkai/cursor/xiaoai-llm-bridge-c4d6/scripts/windows-xiaoai-setup.ps1" `
  -OutFile "$HOME\\xiaoai-setup\\setup.ps1"
powershell -ExecutionPolicy Bypass -File "$HOME\\xiaoai-setup\\setup.ps1"
""",
            styles["code"],
        )
    )
    story.append(
        bullets(
            [
                "输入账号时请用「小米 ID 数字」",
                "密码输入时不会显示在屏幕上，属正常",
                "记下终端输出的音箱 DID（一串数字）",
            ],
            styles["bullet"],
        )
    )

    story.append(p("3.3 小米登录失败时（很常见）", styles["h2"]))
    story.append(
        p(
            "若出现 Login failed / KeyError: userId：通常是小米风控，不是密码一定错。"
            "推荐用现代 OTP 登录脚本（需短信/App 验证码）：",
            styles["body"],
        )
    )
    story.append(
        code_block(
            """# 装包时如需代理可开 Clash；真正登录前请关闭系统代理
Invoke-WebRequest `
  "https://raw.githubusercontent.com/yangkai1998/yangkai/cursor/xiaoai-llm-bridge-c4d6/scripts/windows-xiaomi-modern-login.ps1" `
  -OutFile "$HOME\\xiaoai-setup\\modern-login.ps1"
powershell -ExecutionPolicy Bypass -File "$HOME\\xiaoai-setup\\modern-login.ps1" -SkipInstall
""",
            styles["code"],
        )
    )
    story.append(
        p(
            "成功后用户目录会出现：C:\\Users\\你的用户名\\.mi.token",
            styles["body"],
        )
    )

    story.append(p("3.4 填写配置并首次启动", styles["h2"]))
    story.append(
        p(
            "下载启动脚本并运行（按提示输入小米 ID、DID、DeepSeek Key）：",
            styles["body"],
        )
    )
    story.append(
        code_block(
            """Invoke-WebRequest `
  "https://raw.githubusercontent.com/yangkai1998/yangkai/cursor/xiaoai-llm-bridge-c4d6/scripts/windows-xiaogpt-start.ps1" `
  -OutFile "$HOME\\xiaoai-setup\\start.ps1"
powershell -ExecutionPolicy Bypass -File "$HOME\\xiaoai-setup\\start.ps1"
""",
            styles["code"],
        )
    )
    story.append(
        p(
            "脚本会生成：C:\\Users\\你的用户名\\xiaoai-setup\\xiao_config.yaml"
            " 与 run_xiaogpt_cached.py，并启动桥接。保持窗口开启。",
            styles["body"],
        )
    )

    story.append(p("3.5 日常重新启动（配置已做好后）", styles["h2"]))
    story.append(
        code_block(
            'python "$HOME\\xiaoai-setup\\run_xiaogpt_cached.py" "$HOME\\xiaoai-setup\\xiao_config.yaml"',
            styles["code"],
        )
    )
    story.append(
        p(
            "也可运行仓库脚本创建桌面快捷方式「启动小爱DeepSeek」，以后双击即可。",
            styles["body"],
        )
    )

    # 4
    story.append(p("四、怎么对音箱说话", styles["h1"]))
    story.append(
        simple_table(
            [
                ["场景", "示例"],
                ["触发 DeepSeek", "小爱同学，问助手，明天适合晾衣服吗？"],
                ["触发 DeepSeek", "小爱同学，帮我问，番茄炒蛋怎么做？"],
                ["保持原生小爱", "小爱同学，播放轻音乐"],
                ["保持原生小爱", "小爱同学，打开客厅灯 / 现在几点"],
            ],
            [4.0 * cm, 12.7 * cm],
            styles["table_cell"],
        )
    )
    story.append(Spacer(1, 0.25 * cm))
    story.append(
        p(
            "说明：若语音识别把「问助手」听成「搵助手/温助手」等，配置里已预留常见误听词。"
            "可按需在 xiao_config.yaml 的 keyword 列表自行增减。",
            styles["body"],
        )
    )

    # 5
    story.append(p("五、关键配置说明（xiao_config.yaml）", styles["h1"]))
    story.append(
        code_block(
            """hardware: LX06
account: "你的小米ID数字"
password: ""
mi_did: "音箱DID"

bot: chatgptapi
openai_key: "sk-你的DeepSeek密钥"
api_base: "https://api.deepseek.com/v1"

gpt_options:
  model: "deepseek-v4-flash"   # 可改 deepseek-v4-pro
  temperature: 0.7
  extra_body:
    thinking:
      type: disabled          # DeepSeek V4 建议关闭思考模式

keyword:
  - "问助手"
  - "帮我问"

mute_xiaoai: true
stream: true
verbose: false
""",
            styles["code"],
        )
    )
    story.append(
        bullets(
            [
                "换模型：只改 gpt_options.model，保存后重启桥接",
                "deepseek-v4-flash：更快更省；deepseek-v4-pro：更强通常更贵",
                "verbose 建议 false，避免日志泄露 Key",
            ],
            styles["bullet"],
        )
    )

    # 6
    story.append(PageBreak())
    story.append(p("六、迁到绿联 NAS（可选，适合 7×24）", styles["h1"]))
    story.append(
        p(
            "音箱不用挂进 NAS；是把桥接程序放到 NAS Docker 里常驻。"
            "Windows 跑通后再迁移最稳。不要 Windows 与 NAS 同时跑两套。",
            styles["body"],
        )
    )
    story.append(p("6.1 准备三个文件到 NAS 目录（如 docker/xiaogpt/）", styles["h2"]))
    story.append(
        simple_table(
            [
                ["文件", "来源 / 说明"],
                ["xiao_config.yaml", "Windows：%USERPROFILE%\\xiaoai-setup\\xiao_config.yaml"],
                ["mi.token", "Windows：%USERPROFILE%\\.mi.token，拷过去后去掉开头的点改名"],
                ["docker-compose.yml", "使用仓库 home/docker-compose.yml 内容"],
            ],
            [4.2 * cm, 12.5 * cm],
            styles["table_cell"],
        )
    )
    story.append(Spacer(1, 0.2 * cm))
    story.append(p("6.2 绿联操作", styles["h2"]))
    story.append(
        bullets(
            [
                "应用中心安装 Docker，建议在设置里配置国内镜像加速",
                "Docker → 项目 → 创建 → 选择上述目录或粘贴 compose → 立即部署",
                "容器名一般为 yangkai-xiaogpt；查看日志确认无持续 Login failed",
                "验收：「小爱同学，问助手，今天适合吃什么？」",
                "成功后 Windows 上的 xiaogpt 不要再开",
            ],
            styles["bullet"],
        )
    )
    story.append(
        code_block(
            """# docker-compose.yml 关键片段
services:
  xiaogpt:
    image: yihong0618/xiaogpt:latest
    container_name: yangkai-xiaogpt
    restart: unless-stopped
    volumes:
      - ./xiao_config.yaml:/config/xiao_config.yaml:ro
      - ./mi.token:/root/.mi.token:ro
    environment:
      TZ: Asia/Shanghai
    command: ["--config","/config/xiao_config.yaml","--use_chatgpt_api","--mute_xiaoai","--stream"]
""",
            styles["code"],
        )
    )

    # 7
    story.append(p("七、常见问题（实测踩坑）", styles["h1"]))
    story.append(
        simple_table(
            [
                ["现象", "处理"],
                ["小爱会先说几个字再播 DeepSeek", "原理限制（云端落盘延迟）。保持 mute_xiaoai: true；未刷机难 100% 消除"],
                ["Login failed / userId 报错", "用现代 OTP 登录生成 .mi.token；登录时关 Clash 系统代理"],
                ["装包失败 / GitHub 拉不下", "临时开代理装依赖；登录小米前再关掉"],
                ["DeepSeek 返回空内容", "配置 extra_body.thinking.type: disabled"],
                ["说了问助手没进模型", "检查 keyword；可能被听成搵助手等，把误听词加进列表"],
                ["终端有字音箱不播", "部分型号设 use_command: true；LX06 多数可保持 false"],
                ["NAS 容器一直登录失败", "确认 mi.token 挂载正确；停掉 Windows 端；必要时重生成 token"],
            ],
            [5.2 * cm, 11.5 * cm],
            styles["table_cell"],
        )
    )

    # 8
    story.append(p("八、验收清单", styles["h1"]))
    story.append(
        bullets(
            [
                "Python 与依赖安装完成，能找到 xiaogpt",
                "已生成 .mi.token，并能确认音箱 DID / 型号",
                "xiao_config.yaml 已填写 Key、DID、keyword，thinking 已关闭",
                "桥接进程在运行（Windows 窗口常开，或 NAS 容器运行中）",
                "「问助手」能听到 DeepSeek 回答；不带口令仍可用原生小爱",
                "账号与 Key 未分享给他人、未上传公开位置",
            ],
            styles["bullet"],
        )
    )

    # 9
    story.append(p("九、资料与仓库", styles["h1"]))
    story.append(
        bullets(
            [
                "项目仓库：https://github.com/yangkai1998/yangkai",
                "功能分支（含脚本）：cursor/xiaoai-llm-bridge-c4d6",
                "上游开源：https://github.com/yihong0618/xiaogpt",
                "DeepSeek API：https://api-docs.deepseek.com/",
                "更细的 Markdown：仓库 docs/02-home-path-windows.md、docs/06-ugreen-nas.md、docs/04-troubleshooting.md",
            ],
            styles["bullet"],
        )
    )
    story.append(Spacer(1, 0.4 * cm))
    story.append(
        p(
            "声明：本方案基于社区开源能力与个人实测经验，非小米官方功能；"
            "小米接口变更可能导致失效。请合理使用 API，注意隐私与账号安全。",
            styles["note"],
        )
    )

    doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
    print(f"Wrote {output}")


def main():
    roots = [
        Path("/opt/cursor/artifacts/xiaoai-deepseek-friend-guide.pdf"),
        Path("/workspace/docs/exports/xiaoai-deepseek-friend-guide.pdf"),
    ]
    for out in roots:
        out.parent.mkdir(parents=True, exist_ok=True)
        build_pdf(out)


if __name__ == "__main__":
    main()
