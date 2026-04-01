"""Settings defaults for AI orchestration."""

from app.config import Settings


def test_default_model_chains_are_non_empty() -> None:
    s = Settings()
    assert len(s.free_model_chain) >= 2
    assert len(s.paid_model_chain) >= 1


def test_model_chains_parse_from_env(monkeypatch) -> None:
    monkeypatch.setenv("AI_FREE_MODELS", "a/b,c/d")
    monkeypatch.setenv("AI_PAID_MODELS", "x/y")
    s = Settings()
    assert s.free_model_chain == ["a/b", "c/d"]
    assert s.paid_model_chain == ["x/y"]
