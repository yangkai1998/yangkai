from __future__ import annotations

from typing import Any


def extract_query(payload: dict[str, Any]) -> str:
    """Extract user utterance from XiaoAi skill request body."""
    if isinstance(payload.get("query"), str) and payload["query"].strip():
        return payload["query"].strip()

    request = payload.get("request") or {}
    intent = request.get("intent") or {}
    if isinstance(intent.get("query"), str) and intent["query"].strip():
        return intent["query"].strip()

    # Some platform variants nest slots differently
    slots = intent.get("slots") or {}
    for key in ("question", "content", "query", "q"):
        value = slots.get(key)
        if isinstance(value, dict):
            value = value.get("value")
        if isinstance(value, str) and value.strip():
            return value.strip()

    return ""


def extract_session_id(payload: dict[str, Any]) -> str:
    session = payload.get("session") or {}
    session_id = session.get("session_id") or session.get("id")
    if isinstance(session_id, str) and session_id:
        return session_id
    request = payload.get("request") or {}
    request_id = request.get("request_id")
    if isinstance(request_id, str) and request_id:
        return request_id
    return "default"


def is_launch_request(payload: dict[str, Any], query: str) -> bool:
    request = payload.get("request") or {}
    req_type = request.get("type")
    # Historical docs: type 0/Launch often means skill open
    if req_type in (0, "0", "Launch", "launch"):
        return True
    launch_phrases = {
        "打开杨凯助手",
        "打开智能助手",
        "进入杨凯助手",
        "打开助手",
        "进入助手",
    }
    return query in launch_phrases


def is_exit_request(payload: dict[str, Any], query: str) -> bool:
    request = payload.get("request") or {}
    req_type = request.get("type")
    if req_type in (2, "2", "End", "end", "SessionEnded"):
        return True
    exit_phrases = {"退出", "退出助手", "关闭助手", "结束", "再见"}
    return query in exit_phrases


def match_trigger(query: str, keywords: list[str]) -> tuple[bool, str]:
    """
    Return (matched, cleaned_question).
    If keyword matches as prefix, strip it; otherwise keep original when matched as substring.
    """
    q = query.strip()
    if not keywords:
        return True, q

    for keyword in keywords:
        if q.startswith(keyword):
            rest = q[len(keyword) :].lstrip(" ，,：:.-")
            return True, rest or q
        if keyword in q:
            # Allow "帮我问一下天气怎么样" style
            return True, q
    return False, q


def speak(
    text: str,
    *,
    open_mic: bool = False,
    session_end: bool = False,
) -> dict[str, Any]:
    """Build XiaoAi custom-skill TTS response."""
    return {
        "version": "1.0",
        "response": {
            "open_mic": open_mic,
            "to_speak": {
                "type": 0,
                "text": text,
            },
        },
        "is_session_end": session_end,
    }
