"""Environment-driven configuration for OpenRouter, Qdrant, and orchestration."""

from __future__ import annotations

from typing import List

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _parse_model_chain(raw: str) -> List[str]:
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    return parts


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    openrouter_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("OPENROUTER_API_KEY", "AI_OPENROUTER_API_KEY"),
    )
    openrouter_base_url: str = Field(
        default="https://openrouter.ai/api/v1",
        validation_alias=AliasChoices("OPENROUTER_BASE_URL", "AI_OPENROUTER_BASE_URL"),
    )
    qdrant_url: str = Field(
        default="http://127.0.0.1:6333",
        validation_alias=AliasChoices("QDRANT_URL", "AI_QDRANT_URL"),
    )
    internal_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("AI_SERVICE_INTERNAL_KEY", "AI_INTERNAL_API_KEY"),
    )

    free_models: str = Field(
        default=(
            "meta-llama/llama-3.1-8b-instruct:free,"
            "google/gemma-2-9b-it:free,"
            "mistralai/mistral-7b-instruct:free"
        ),
        validation_alias=AliasChoices("AI_FREE_MODELS"),
    )
    paid_models: str = Field(
        default="anthropic/claude-3.5-sonnet,openai/gpt-4o",
        validation_alias=AliasChoices("AI_PAID_MODELS"),
    )
    paid_fallback_for_free_model: str = Field(
        default="openai/gpt-4o-mini",
        validation_alias=AliasChoices("AI_PAID_FALLBACK_FOR_FREE_MODEL"),
    )
    allow_paid_fallback_for_free: bool = Field(
        default=False,
        validation_alias=AliasChoices("AI_ALLOW_PAID_FALLBACK_FOR_FREE"),
    )

    embedding_model: str = Field(
        default="openai/text-embedding-3-small",
        validation_alias=AliasChoices("AI_EMBEDDING_MODEL"),
    )
    qdrant_collection: str = Field(
        default="wb_helper_products",
        validation_alias=AliasChoices("AI_QDRANT_COLLECTION"),
    )

    chat_max_retries: int = Field(default=3, ge=1, le=10)
    chat_retry_backoff_base_s: float = Field(default=0.5, ge=0.05)
    chat_request_timeout_s: float = Field(default=120.0, ge=1.0)
    max_total_message_chars: int = Field(default=120_000, ge=1024)

    circuit_failure_threshold: int = Field(default=5, ge=1)
    circuit_open_seconds: float = Field(default=120.0, ge=1.0)

    @field_validator("free_models", "paid_models", mode="before")
    @classmethod
    def _strip_strings(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v

    @property
    def free_model_chain(self) -> List[str]:
        return _parse_model_chain(self.free_models)

    @property
    def paid_model_chain(self) -> List[str]:
        return _parse_model_chain(self.paid_models)


def get_settings() -> Settings:
    """Fresh read each call so tests can vary env without cache issues."""
    return Settings()
