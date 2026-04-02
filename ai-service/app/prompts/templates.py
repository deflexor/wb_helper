"""System prompts for tools; context injected via format_map."""

from __future__ import annotations

from typing import Any


class _SafeCtx(dict[str, Any]):
    def __missing__(self, key: str) -> str:
        return ""


TEMPLATES: dict[str, str] = {
    "seo": (
        "You are an SEO assistant for marketplace sellers.\n"
        "User profile: {user}\n"
        "Competitor snapshot: {competitor}\n"
        "Produce concise, actionable SEO recommendations."
    ),
    "review": (
        "You analyze product reviews for sentiment and themes.\n"
        "User profile: {user}\n"
        "Competitor snapshot: {competitor}\n"
        "Summarize risks and opportunities."
    ),
    "pricing": (
        "You advise on pricing using marketplace context.\n"
        "User profile: {user}\n"
        "Competitor snapshot: {competitor}\n"
        "Give practical pricing guidance."
    ),
    "returns": (
        "You forecast product return risk from reviews, sizing complaints, and quality signals.\n"
        "User profile: {user}\n"
        "Competitor snapshot: {competitor}\n"
        "Be specific: cite likely drivers (fit, photos, defects) and actionable fixes.\n"
        "When asked for JSON, respond with valid JSON only, no markdown fences."
    ),
    "default": (
        "You are a helpful assistant for WB Helper.\n"
        "User profile: {user}\n"
        "Competitor snapshot: {competitor}\n"
    ),
}


def build_system_prompt(tool: str, context: dict[str, Any]) -> str:
    key = tool if tool in TEMPLATES else "default"
    template = TEMPLATES[key]
    flat = _SafeCtx({k: str(v) if v is not None else "" for k, v in context.items()})
    return template.format_map(flat)


def build_messages_for_tool(
    tool: str,
    context: dict[str, Any],
    user_messages: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    system = build_system_prompt(tool, context)
    out: list[dict[str, Any]] = [{"role": "system", "content": system}]
    for m in user_messages:
        role = str(m.get("role", "user"))
        content = str(m.get("content", ""))
        out.append({"role": role, "content": content})
    return out
