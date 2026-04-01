"""Structured prompts with context injection."""

from app.prompts.templates import build_messages_for_tool, build_system_prompt


def test_seo_prompt_includes_user_and_competitor() -> None:
    text = build_system_prompt(
        "seo",
        {"user": "seller A", "competitor": "rival X"},
    )
    assert "seller A" in text
    assert "rival X" in text


def test_missing_context_keys_are_empty() -> None:
    text = build_system_prompt("review", {})
    assert "User profile:" in text


def test_build_messages_prepends_system() -> None:
    msgs = build_messages_for_tool(
        "pricing",
        {"user": "u"},
        [{"role": "user", "content": "go"}],
    )
    assert msgs[0]["role"] == "system"
    assert "u" in msgs[0]["content"]
    assert msgs[1] == {"role": "user", "content": "go"}
