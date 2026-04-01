"""HTTP contract for /v1 routes (internal key + OpenRouter mocks)."""

import httpx
import pytest
import respx
from fastapi.testclient import TestClient


def test_health_unauthenticated() -> None:
    from app.main import app

    with TestClient(app) as client:
        r = client.get("/health")
    assert r.status_code == 200


def test_v1_requires_internal_key_when_configured(monkeypatch) -> None:
    monkeypatch.setenv("AI_SERVICE_INTERNAL_KEY", "secret")
    monkeypatch.setenv("OPENROUTER_API_KEY", "k")
    import importlib

    import app.main as main_mod

    importlib.reload(main_mod)
    with TestClient(main_mod.app) as client:
        r = client.post(
            "/v1/chat/completions",
            json={
                "subscription_tier": "free",
                "tool": "seo",
                "messages": [{"role": "user", "content": "hi"}],
            },
        )
        assert r.status_code == 401


@respx.mock
def test_v1_chat_completions_success(monkeypatch) -> None:
    monkeypatch.delenv("AI_SERVICE_INTERNAL_KEY", raising=False)
    monkeypatch.setenv("OPENROUTER_API_KEY", "k")
    monkeypatch.setenv("AI_FREE_MODELS", "m1")

    import importlib

    import app.main as main_mod

    importlib.reload(main_mod)

    respx.post("https://openrouter.ai/api/v1/chat/completions").mock(
        return_value=httpx.Response(
            200,
            json={"choices": [{"message": {"content": "done"}}]},
        )
    )

    with TestClient(main_mod.app) as client:
        r = client.post(
            "/v1/chat/completions",
            json={
                "subscription_tier": "free",
                "tool": "seo",
                "messages": [{"role": "user", "content": "hi"}],
                "context": {"user": "seller"},
            },
        )
    assert r.status_code == 200
    data = r.json()
    assert data["content"] == "done"
    assert data["model_used"] == "m1"
