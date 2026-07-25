"""Safe end-to-end diagnostics for the local XiaoAi/xiaogpt setup.

This script never prints API keys, Xiaomi service tokens, cookies, or passwords.
"""

from __future__ import annotations

import asyncio
import json
import sys
import time
from pathlib import Path

import aiohttp
import yaml
from miservice import MiAccount, MiNAService
from openai import AsyncOpenAI


HOME = Path.home()
TOKEN_PATH = HOME / ".mi.token"
CONFIG_PATH = HOME / "xiaoai-setup" / "xiao_config.yaml"


def ok(message: str) -> None:
    print(f"[OK] {message}")


def fail(message: str) -> None:
    print(f"[FAIL] {message}")


def info(message: str) -> None:
    print(f"[INFO] {message}")


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8-sig") as file:
        return json.load(file)


def load_yaml(path: Path) -> dict:
    with path.open("r", encoding="utf-8-sig") as file:
        return yaml.safe_load(file) or {}


async def diagnose_xiaomi(config: dict, token: dict) -> None:
    did = str(config.get("mi_did", ""))
    hardware = str(config.get("hardware", ""))

    async with aiohttp.ClientSession() as session:
        account = MiAccount(
            session,
            str(config.get("account", "")),
            str(config.get("password", "")),
            str(TOKEN_PATH),
        )
        # Old MiService loads token in __init__. Do not call login(), because the
        # verified cached service token must not be refreshed by the legacy flow.
        if getattr(account, "token", None) is None:
            account.token = token

        mina = MiNAService(account)
        try:
            devices = await mina.device_list()
        except Exception as exc:  # noqa: BLE001
            fail(f"小米 MiNA 设备列表失败：{type(exc).__name__}: {exc}")
            return

        if not devices:
            fail("小米 MiNA 返回空设备列表")
            return

        device = next(
            (
                item
                for item in devices
                if str(item.get("miotDID", "")) == did
                or str(item.get("hardware", "")).upper() == hardware.upper()
            ),
            None,
        )
        if not device:
            fail(f"设备列表里找不到 DID={did} / hardware={hardware}")
            return

        device_id = str(device.get("deviceID", ""))
        ok(
            "找到音箱："
            f"name={device.get('name', '?')}, hardware={device.get('hardware', '?')}, DID={did}"
        )

        # Test the newer UBus source.
        try:
            messages = await mina.get_latest_ask(device_id)
            if messages:
                latest = max(
                    messages, key=lambda item: int(item.get("timestamp_ms", 0))
                )
                answers = latest.get("response", {}).get("answer", [])
                question = answers[0].get("question", "") if answers else ""
                ok(f"UBus 找到 {len(messages)} 条记录，最新问题：{question!r}")
            else:
                fail("UBus 没有返回最近问题")
        except Exception as exc:  # noqa: BLE001
            fail(f"UBus 读取问题失败：{type(exc).__name__}: {exc}")

        # Test xiaogpt's legacy conversation source independently.
        try:
            micoapi = token.get("micoapi")
            if not micoapi or len(micoapi) < 2:
                fail("认证缓存缺少 micoapi service token")
                return
            cookies = {
                "deviceId": device_id,
                "serviceToken": micoapi[1],
                "userId": str(token.get("userId", "")),
            }
            url = (
                "https://userprofile.mina.mi.com/device_profile/v2/conversation"
                f"?source=dialogu&hardware={hardware}"
                f"&timestamp={int(time.time() * 1000)}&limit=10"
            )
            async with session.get(url, cookies=cookies) as response:
                status = response.status
                try:
                    payload = await response.json(content_type=None)
                except Exception:  # noqa: BLE001
                    payload = {}

            data = payload.get("data")
            records: list[dict] = []
            if isinstance(data, str):
                records = (json.loads(data) or {}).get("records") or []
            elif isinstance(data, dict):
                records = data.get("records") or []

            if records:
                latest_query = records[0].get("query", "")
                ok(
                    f"conversation 接口 HTTP {status}，"
                    f"找到 {len(records)} 条记录，最新问题：{latest_query!r}"
                )
            else:
                fail(
                    f"conversation 接口 HTTP {status}，"
                    f"code={payload.get('code')!r}，没有问题记录"
                )
        except Exception as exc:  # noqa: BLE001
            fail(f"conversation 接口测试失败：{type(exc).__name__}: {exc}")


async def diagnose_deepseek(config: dict) -> None:
    key = str(config.get("openai_key", ""))
    base_url = str(config.get("api_base", ""))
    model = str((config.get("gpt_options") or {}).get("model", ""))
    if not key or not base_url or not model:
        fail("DeepSeek 配置不完整")
        return

    try:
        client = AsyncOpenAI(api_key=key, base_url=base_url)
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "只回复两个字：正常"}],
            temperature=0,
            max_tokens=32,
            extra_body={"thinking": {"type": "disabled"}},
        )
        text = (response.choices[0].message.content or "").strip()
        ok(f"DeepSeek API 调用成功，模型={model}，回复={text!r}")
    except Exception as exc:  # noqa: BLE001
        fail(f"DeepSeek API 调用失败：{type(exc).__name__}: {exc}")


async def main() -> int:
    print("=== XiaoAi / DeepSeek 安全诊断 ===")
    print("不会打印密码、Cookie、Token 或 API Key。\n")

    if not TOKEN_PATH.exists():
        fail(f"找不到认证文件：{TOKEN_PATH}")
        return 1
    if not CONFIG_PATH.exists():
        fail(f"找不到配置文件：{CONFIG_PATH}")
        return 1

    try:
        token = load_json(TOKEN_PATH)
        config = load_yaml(CONFIG_PATH)
    except Exception as exc:  # noqa: BLE001
        fail(f"读取本地文件失败：{type(exc).__name__}: {exc}")
        return 1

    info("开始测试小米音箱和两种问题记录接口……")
    await diagnose_xiaomi(config, token)
    print()
    info("开始发送一个最小 DeepSeek 测试请求……")
    await diagnose_deepseek(config)
    print("\n=== 诊断结束 ===")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
