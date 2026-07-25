from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse

from .config import Settings, get_settings
from .llm import LLMError, ask_llm
from .memory import SessionMemory
from .xiaoai import (
    extract_query,
    extract_session_id,
    is_exit_request,
    is_launch_request,
    match_trigger,
    speak,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("xiaoai-bridge")

memory = SessionMemory(max_turns=get_settings().max_history_turns)

app = FastAPI(title="yangkai-xiaoai-bridge", version="1.0.0")


def _authorize(
    settings: Settings,
    *,
    token_query: str | None,
    token_header: str | None,
) -> None:
    expected = settings.skill_shared_token
    if not expected:
        return
    provided = token_query or token_header or ""
    if provided != expected:
        raise HTTPException(status_code=401, detail="unauthorized")


@app.get("/health")
async def health() -> dict[str, Any]:
    settings = get_settings()
    return {
        "ok": True,
        "service": settings.app_name,
        "llm_configured": bool(settings.llm_api_key),
        "keywords": settings.keywords,
    }


@app.post("/xiaoai/skill")
async def xiaoai_skill(
    request: Request,
    token: str | None = Query(default=None),
    x_skill_token: str | None = Header(default=None),
) -> JSONResponse:
    """
    XiaoAi Open Platform custom-skill webhook.

    Usage on speaker (after skill is opened):
      「问助手 明天适合晾衣服吗」
    """
    settings = get_settings()
    _authorize(settings, token_query=token, token_header=x_skill_token)

    try:
        payload = await request.json()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="invalid json") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="payload must be object")

    query = extract_query(payload)
    session_id = extract_session_id(payload)
    logger.info("skill request session=%s query=%s", session_id, query)

    if is_launch_request(payload, query):
        return JSONResponse(
            speak(
                "杨凯助手已打开。请说：问助手，再加你的问题。",
                open_mic=True,
                session_end=False,
            )
        )

    if is_exit_request(payload, query):
        memory.clear(session_id)
        return JSONResponse(speak("好的，下次再叫我。", open_mic=False, session_end=True))

    if not query:
        return JSONResponse(
            speak("我没有听清，请再说一次，例如：问助手，今天天气怎么样。", open_mic=True)
        )

    matched, question = match_trigger(query, settings.keywords)
    if not matched:
        hint = "、".join(settings.keywords[:3]) or "问助手"
        return JSONResponse(
            speak(
                f"如需智能回答，请用「{hint}」开头，例如：问助手，怎么做番茄炒蛋。",
                open_mic=True,
            )
        )

    history = memory.get(session_id) if settings.enable_session_memory else []
    try:
        answer = await ask_llm(settings, question, history=history)
    except LLMError as exc:
        return JSONResponse(speak(str(exc), open_mic=True))

    if settings.enable_session_memory:
        memory.append(session_id, question, answer)

    return JSONResponse(speak(answer, open_mic=True, session_end=False))


@app.post("/debug/ask")
async def debug_ask(body: dict[str, Any]) -> dict[str, Any]:
    """Local/manual test endpoint without XiaoAi envelope."""
    settings = get_settings()
    text = str(body.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    matched, question = match_trigger(text, settings.keywords)
    if not matched:
        return {"matched": False, "reply": "未命中触发口令"}

    try:
        answer = await ask_llm(settings, question)
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"matched": True, "question": question, "reply": answer}
