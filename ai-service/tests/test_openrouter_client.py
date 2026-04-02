"""OpenRouter HTTP client behavior (mocked)."""

import httpx
import pytest
import respx

from app.config import Settings
from app.openrouter_client import (
    OpenRouterHttpError,
    classify_http_status,
    fetch_chat_completion,
    fetch_embeddings,
)


def test_classify_http_status() -> None:
    assert classify_http_status(200) == "success"
    assert classify_http_status(429) == "retry"
    assert classify_http_status(503) == "retry"
    assert classify_http_status(400) == "fatal"


@pytest.mark.asyncio
@respx.mock
async def test_fetch_chat_completion_parses_message() -> None:
    settings = Settings(openrouter_api_key="k")
    route = respx.post("https://openrouter.ai/api/v1/chat/completions").mock(
        return_value=httpx.Response(
            200,
            json={
                "choices": [{"message": {"role": "assistant", "content": "hello"}}],
                "model": "x",
                "usage": {
                    "prompt_tokens": 10,
                    "completion_tokens": 3,
                    "total_tokens": 13,
                },
            },
        )
    )
    async with httpx.AsyncClient() as client:
        out = await fetch_chat_completion(
            client,
            settings,
            model="m1",
            messages=[{"role": "user", "content": "hi"}],
        )
    assert out.content == "hello"
    assert out.usage == {
        "prompt_tokens": 10,
        "completion_tokens": 3,
        "total_tokens": 13,
    }
    assert route.called


@pytest.mark.asyncio
@respx.mock
async def test_fetch_chat_completion_raises_retryable() -> None:
    settings = Settings(openrouter_api_key="k")
    respx.post("https://openrouter.ai/api/v1/chat/completions").mock(
        return_value=httpx.Response(503, text="no")
    )
    async with httpx.AsyncClient() as client:
        with pytest.raises(OpenRouterHttpError) as ei:
            await fetch_chat_completion(
                client,
                settings,
                model="m1",
                messages=[{"role": "user", "content": "hi"}],
            )
    assert ei.value.retryable is True


@pytest.mark.asyncio
@respx.mock
async def test_fetch_embeddings_returns_vectors() -> None:
    settings = Settings(openrouter_api_key="k")
    respx.post("https://openrouter.ai/api/v1/embeddings").mock(
        return_value=httpx.Response(
            200,
            json={"data": [{"embedding": [0.1, 0.2, 0.3]}, {"embedding": [1.0, 0.0, 0.0]}]},
        )
    )
    async with httpx.AsyncClient() as client:
        vecs = await fetch_embeddings(client, settings, ["a", "b"])
    assert len(vecs) == 2
    assert vecs[0] == [0.1, 0.2, 0.3]
