from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app, memory


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    get_settings.cache_clear()
    monkeypatch.setenv("LLM_API_KEY", "test-key")
    monkeypatch.setenv("TRIGGER_KEYWORDS", "问助手,问杨凯")
    monkeypatch.setenv("SKILL_SHARED_TOKEN", "")
    get_settings.cache_clear()
    memory.clear("s1")
    yield
    get_settings.cache_clear()


@pytest.fixture
def client():
    return TestClient(app)


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["ok"] is True
    assert "问助手" in resp.json()["keywords"]


def test_launch(client):
    resp = client.post(
        "/xiaoai/skill",
        json={"query": "打开杨凯助手", "session": {"session_id": "s1"}, "request": {"type": 0}},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "杨凯助手" in data["response"]["to_speak"]["text"]
    assert data["response"]["open_mic"] is True


def test_keyword_gate(client):
    resp = client.post(
        "/xiaoai/skill",
        json={"query": "播放音乐", "session": {"session_id": "s1"}, "request": {"type": 1}},
    )
    assert resp.status_code == 200
    assert "问助手" in resp.json()["response"]["to_speak"]["text"]


def test_llm_happy_path(client):
    with patch("app.main.ask_llm", new=AsyncMock(return_value="今天适合晾衣服。")) as mocked:
        resp = client.post(
            "/xiaoai/skill",
            json={
                "query": "问助手 今天适合晾衣服吗",
                "session": {"session_id": "s1"},
                "request": {"type": 1, "intent": {"query": "问助手 今天适合晾衣服吗"}},
            },
        )
    assert resp.status_code == 200
    assert resp.json()["response"]["to_speak"]["text"] == "今天适合晾衣服。"
    mocked.assert_awaited()


def test_token_auth(monkeypatch, client):
    monkeypatch.setenv("SKILL_SHARED_TOKEN", "secret")
    get_settings.cache_clear()

    denied = client.post("/xiaoai/skill", json={"query": "问助手 你好"})
    assert denied.status_code == 401

    ok = client.post("/xiaoai/skill?token=secret", json={"query": "退出"})
    assert ok.status_code == 200
