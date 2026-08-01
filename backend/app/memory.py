from __future__ import annotations

from collections import defaultdict, deque
from threading import Lock


class SessionMemory:
    """In-memory short chat history per XiaoAi session_id."""

    def __init__(self, max_turns: int = 4) -> None:
        self._max_turns = max(1, max_turns)
        self._store: dict[str, deque[dict[str, str]]] = defaultdict(
            lambda: deque(maxlen=self._max_turns * 2)
        )
        self._lock = Lock()

    def get(self, session_id: str) -> list[dict[str, str]]:
        with self._lock:
            return list(self._store.get(session_id, []))

    def append(self, session_id: str, user_text: str, assistant_text: str) -> None:
        with self._lock:
            bucket = self._store[session_id]
            bucket.append({"role": "user", "content": user_text})
            bucket.append({"role": "assistant", "content": assistant_text})

    def clear(self, session_id: str) -> None:
        with self._lock:
            self._store.pop(session_id, None)
