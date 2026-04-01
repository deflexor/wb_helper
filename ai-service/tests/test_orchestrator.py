"""Orchestrator routing, retries, truncation."""

import json

import httpx
import pytest
import respx

from app.circuit_breaker import CircuitBreaker
from app.config import Settings
from app.orchestrator import (
    AllModelsFailedError,
    run_chat_orchestration,
    truncate_messages,
)


def test_truncate_messages_preserves_order_and_budget() -> None:
    msgs = [
        {"role": "system", "content": "ab"},
        {"role": "user", "content": "cdef"},
    ]
    out = truncate_messages(msgs, max_chars=4)
    assert out[0]["content"] == "ab"
    assert out[1]["content"] == "cd"


def test_truncate_single_huge_message_does_not_crash() -> None:
    big = "x" * 50_000
    out = truncate_messages([{"role": "user", "content": big}], max_chars=1000)
    assert sum(len(m["content"]) for m in out) <= 1000


@pytest.mark.asyncio
@respx.mock
async def test_fallback_to_second_model(monkeypatch) -> None:
    monkeypatch.setenv("AI_FREE_MODELS", "m-bad,m-good")
    settings = Settings(openrouter_api_key="k", chat_max_retries=2, chat_retry_backoff_base_s=0.05)

    async def instant_sleep(_: float) -> None:
        return None

    monkeypatch.setattr("app.orchestrator.asyncio.sleep", instant_sleep)

    def responder(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content.decode())
        model = body["model"]
        if model == "m-bad":
            return httpx.Response(503, text="bad")
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": "ok-from-good"}}]},
        )

    respx.post("https://openrouter.ai/api/v1/chat/completions").mock(side_effect=responder)

    breaker = CircuitBreaker(failure_threshold=5, open_seconds=1.0)
    async with httpx.AsyncClient() as client:
        result = await run_chat_orchestration(
            settings=settings,
            breaker=breaker,
            client=client,
            subscription_tier="free",
            tool="seo",
            user_messages=[{"role": "user", "content": "hi"}],
            context={"user": "u1"},
        )

    assert result.content == "ok-from-good"
    assert result.model_used == "m-good"
    assert any(e.get("event") == "model_switch" for e in result.events)


@pytest.mark.asyncio
@respx.mock
async def test_all_models_fail_raises(monkeypatch) -> None:
    monkeypatch.setenv("AI_FREE_MODELS", "m1")
    settings = Settings(openrouter_api_key="k", chat_max_retries=1)
    respx.post("https://openrouter.ai/api/v1/chat/completions").mock(
        return_value=httpx.Response(400, text="nope")
    )
    breaker = CircuitBreaker(failure_threshold=5, open_seconds=1.0)
    async with httpx.AsyncClient() as client:
        with pytest.raises(AllModelsFailedError):
            await run_chat_orchestration(
                settings=settings,
                breaker=breaker,
                client=client,
                subscription_tier="free",
                tool="default",
                user_messages=[{"role": "user", "content": "x"}],
            )


@pytest.mark.asyncio
@respx.mock
async def test_paid_fallback_warning_flag(monkeypatch) -> None:
    monkeypatch.setenv("AI_ALLOW_PAID_FALLBACK_FOR_FREE", "true")
    monkeypatch.setenv("AI_FREE_MODELS", "m-bad")
    monkeypatch.setenv("AI_PAID_FALLBACK_FOR_FREE_MODEL", "m-mini")
    settings = Settings(openrouter_api_key="k", chat_max_retries=1)

    def responder(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content.decode())
        if body["model"] == "m-bad":
            return httpx.Response(500)
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": "mini"}}]},
        )

    respx.post("https://openrouter.ai/api/v1/chat/completions").mock(side_effect=responder)

    breaker = CircuitBreaker(failure_threshold=5, open_seconds=1.0)
    async with httpx.AsyncClient() as client:
        result = await run_chat_orchestration(
            settings=settings,
            breaker=breaker,
            client=client,
            subscription_tier="free",
            tool="seo",
            user_messages=[{"role": "user", "content": "q"}],
        )
    assert result.model_used == "m-mini"
    assert "paid_fallback_model_used" in result.warnings
