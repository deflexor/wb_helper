"""Model routing by subscription tier and tool."""

from app.config import Settings
from app.model_router import ToolName, build_model_chain


def test_free_tier_uses_free_chain() -> None:
    s = Settings()
    chain = build_model_chain("free", "seo", s)
    assert chain[0] in s.free_model_chain
    assert chain == s.free_model_chain


def test_paid_tier_uses_paid_chain() -> None:
    s = Settings()
    chain = build_model_chain("paid", "review", s)
    assert chain == s.paid_model_chain


def test_unknown_tool_uses_default_chain() -> None:
    s = Settings()
    assert build_model_chain("free", "default", s) == s.free_model_chain
    assert build_model_chain("paid", "default", s) == s.paid_model_chain


def test_free_tier_appends_paid_fallback_when_enabled(monkeypatch) -> None:
    monkeypatch.setenv("AI_ALLOW_PAID_FALLBACK_FOR_FREE", "true")
    s = Settings()
    chain = build_model_chain("free", "seo", s)
    assert chain[:-1] == s.free_model_chain
    assert chain[-1] == s.paid_fallback_for_free_model


def test_tool_literal_typing() -> None:
    _tool: ToolName = "seo"
