"""Low-level OpenRouter chat + embeddings calls."""

from __future__ import annotations

from typing import Any, Literal

import httpx

from app.config import Settings

Classification = Literal["success", "retry", "fatal"]


def classify_http_status(status_code: int) -> Classification:
    if status_code == 200:
        return "success"
    if status_code in (408, 429) or 500 <= status_code < 600:
        return "retry"
    return "fatal"


class OpenRouterHttpError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail

    @property
    def retryable(self) -> bool:
        return classify_http_status(self.status_code) == "retry"


def _headers(settings: Settings) -> dict[str, str]:
    h: dict[str, str] = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
    }
    if settings.openrouter_api_key:
        h.setdefault("HTTP-Referer", "https://wb-helper.local")
    return h


async def fetch_chat_completion(
    client: httpx.AsyncClient,
    settings: Settings,
    *,
    model: str,
    messages: list[dict[str, Any]],
) -> str:
    url = f"{settings.openrouter_base_url.rstrip('/')}/chat/completions"
    try:
        r = await client.post(
            url,
            headers=_headers(settings),
            json={"model": model, "messages": messages},
            timeout=settings.chat_request_timeout_s,
        )
    except httpx.TimeoutException as e:
        raise OpenRouterHttpError(408, f"timeout: {e}") from e

    if classify_http_status(r.status_code) != "success":
        raise OpenRouterHttpError(r.status_code, r.text[:2000])

    data = r.json()
    choices = data.get("choices") or []
    if not choices:
        raise OpenRouterHttpError(502, "missing choices in OpenRouter response")
    msg = (choices[0].get("message") or {}).get("content")
    if msg is None:
        raise OpenRouterHttpError(502, "missing message content")
    return str(msg)


async def fetch_embeddings(
    client: httpx.AsyncClient,
    settings: Settings,
    inputs: list[str],
) -> list[list[float]]:
    url = f"{settings.openrouter_base_url.rstrip('/')}/embeddings"
    try:
        r = await client.post(
            url,
            headers=_headers(settings),
            json={"model": settings.embedding_model, "input": inputs},
            timeout=settings.chat_request_timeout_s,
        )
    except httpx.TimeoutException as e:
        raise OpenRouterHttpError(408, f"timeout: {e}") from e

    if classify_http_status(r.status_code) != "success":
        raise OpenRouterHttpError(r.status_code, r.text[:2000])

    data = r.json()
    rows = data.get("data") or []
    out: list[list[float]] = []
    for row in sorted(rows, key=lambda x: x.get("index", 0)):
        emb = row.get("embedding")
        if not isinstance(emb, list):
            raise OpenRouterHttpError(502, "invalid embedding row")
        out.append([float(x) for x in emb])
    if len(out) != len(inputs):
        raise OpenRouterHttpError(502, "embedding count mismatch")
    return out
