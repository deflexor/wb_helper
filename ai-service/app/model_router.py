"""Select ordered OpenRouter model IDs from subscription tier and tool."""

from __future__ import annotations

from typing import Literal

from app.config import Settings

ToolName = Literal["seo", "review", "pricing", "returns", "default"]


def build_model_chain(tier: str, tool: ToolName, settings: Settings) -> list[str]:
    """Return models to try in order. Tool may specialize chains later; same base per tier today."""
    _ = tool  # reserved for per-tool tuning
    tier_norm = tier.lower().strip()
    if tier_norm == "paid":
        chain = list(settings.paid_model_chain)
    else:
        chain = list(settings.free_model_chain)
        if settings.allow_paid_fallback_for_free:
            chain.append(settings.paid_fallback_for_free_model)
    return chain
