"""Chat orchestration: routing, retries, circuit breaker, fallbacks."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any

import httpx

from app.circuit_breaker import CircuitBreaker
from app.config import Settings
from app.model_router import ToolName, build_model_chain
from app.openrouter_client import OpenRouterHttpError, fetch_chat_completion
from app.prompts.templates import build_messages_for_tool

logger = logging.getLogger(__name__)


@dataclass
class ChatOrchestrationResult:
    content: str
    model_used: str
    warnings: list[str] = field(default_factory=list)
    events: list[dict[str, Any]] = field(default_factory=list)


class AllModelsFailedError(Exception):
    def __init__(self, last_error: str, events: list[dict[str, Any]]) -> None:
        super().__init__(last_error)
        self.last_error = last_error
        self.events = events


def truncate_messages(messages: list[dict[str, Any]], max_chars: int) -> list[dict[str, Any]]:
    """Keep message order; include as many full messages as fit, then truncate one body."""
    if max_chars <= 0:
        return []
    out: list[dict[str, Any]] = []
    budget = max_chars
    for m in messages:
        role = str(m.get("role", "user"))
        content = str(m.get("content", ""))
        if len(content) <= budget:
            out.append({"role": role, "content": content})
            budget -= len(content)
            if budget == 0:
                break
        else:
            out.append({"role": role, "content": content[:budget]})
            break
    return out


async def run_chat_orchestration(
    *,
    settings: Settings,
    breaker: CircuitBreaker,
    client: httpx.AsyncClient,
    subscription_tier: str,
    tool: ToolName,
    user_messages: list[dict[str, Any]],
    context: dict[str, Any] | None = None,
) -> ChatOrchestrationResult:
    ctx = context or {}
    messages = build_messages_for_tool(tool, ctx, user_messages)
    messages = truncate_messages(messages, settings.max_total_message_chars)

    models = build_model_chain(subscription_tier, tool, settings)
    events: list[dict[str, Any]] = []
    warnings: list[str] = []
    tier_l = subscription_tier.lower().strip()
    last_err = ""

    for model in models:
        if not breaker.allow(model):
            events.append({"model": model, "event": "circuit_open"})
            logger.warning("orchestrator circuit_open model=%s", model)
            continue

        if (
            tier_l == "free"
            and model == settings.paid_fallback_for_free_model
            and settings.allow_paid_fallback_for_free
        ):
            warnings.append("paid_fallback_model_used")
            events.append({"model": model, "event": "paid_fallback_warning"})
            logger.warning("orchestrator using paid fallback for free tier model=%s", model)

        for attempt in range(settings.chat_max_retries):
            try:
                content = await fetch_chat_completion(
                    client,
                    settings,
                    model=model,
                    messages=messages,
                )
                breaker.record_success(model)
                events.append({"model": model, "event": "success", "attempt": attempt + 1})
                logger.info(
                    "orchestrator success model=%s attempt=%s",
                    model,
                    attempt + 1,
                )
                return ChatOrchestrationResult(
                    content=content,
                    model_used=model,
                    warnings=warnings,
                    events=events,
                )
            except OpenRouterHttpError as e:
                last_err = str(e)
                events.append(
                    {
                        "model": model,
                        "event": "error",
                        "attempt": attempt + 1,
                        "status": e.status_code,
                        "retryable": e.retryable,
                    }
                )
                logger.warning(
                    "orchestrator error model=%s attempt=%s status=%s retryable=%s",
                    model,
                    attempt + 1,
                    e.status_code,
                    e.retryable,
                )
                if e.retryable and attempt + 1 < settings.chat_max_retries:
                    delay = settings.chat_retry_backoff_base_s * (2**attempt)
                    events.append({"model": model, "event": "retry_sleep", "seconds": delay})
                    await asyncio.sleep(delay)
                    continue
                breaker.record_failure(model)
                events.append({"model": model, "event": "model_switch"})
                logger.warning("orchestrator switch model=%s reason=%s", model, last_err)
                break

    raise AllModelsFailedError(last_err or "no models attempted", events)
