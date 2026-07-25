from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # OpenAI-compatible LLM
    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    llm_timeout_seconds: float = 8.0
    llm_max_tokens: int = 220
    llm_temperature: float = 0.7

    # Trigger keywords for path B (specific wake phrases inside skill session)
    trigger_keywords: str = "问助手,问杨凯,帮我问"
    strip_keywords: bool = True

    # Reply style for speaker TTS
    system_prompt: str = (
        "你是运行在小爱音箱上的居家智能助手。用简洁自然的中文回答，"
        "优先控制在 80 字以内，必要时最多 150 字。不要使用 Markdown、"
        "列表符号或表情。如果不确定，就直说不确定。"
    )

    # Optional shared secret: XiaoAi platform may send a custom header,
    # or you can put ?token=... on the skill URL.
    skill_shared_token: str = ""

    # Keep short conversation memory keyed by session_id
    enable_session_memory: bool = True
    max_history_turns: int = 4

    app_name: str = "yangkai-xiaoai-bridge"
    host: str = "0.0.0.0"
    port: int = 8080

    @property
    def keywords(self) -> list[str]:
        return [k.strip() for k in self.trigger_keywords.split(",") if k.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
