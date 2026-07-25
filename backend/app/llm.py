from __future__ import annotations

import logging
from typing import Any

import httpx

from .config import Settings

logger = logging.getLogger(__name__)


class LLMError(Exception):
    """Raised when the upstream LLM call fails."""


async def ask_llm(
    settings: Settings,
    user_text: str,
    history: list[dict[str, str]] | None = None,
) -> str:
    if not settings.llm_api_key:
        raise LLMError("未配置 LLM_API_KEY，请先在 .env 中填写大模型密钥。")

    messages: list[dict[str, str]] = [{"role": "system", "content": settings.system_prompt}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_text})

    payload: dict[str, Any] = {
        "model": settings.llm_model,
        "messages": messages,
        "temperature": settings.llm_temperature,
        "max_tokens": settings.llm_max_tokens,
    }

    url = settings.llm_base_url.rstrip("/") + "/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.llm_api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
    except httpx.TimeoutException as exc:
        raise LLMError("大模型响应超时，请稍后再试。") from exc
    except httpx.HTTPError as exc:
        logger.exception("LLM HTTP error")
        raise LLMError("大模型服务暂时不可用，请稍后再试。") from exc

    try:
        text = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        logger.error("Unexpected LLM response: %s", data)
        raise LLMError("大模型返回格式异常。") from exc

    text = (text or "").strip()
    if not text:
        raise LLMError("大模型没有返回有效内容。")
    return text
