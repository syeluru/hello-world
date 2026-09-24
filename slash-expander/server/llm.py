"""Claude call that turns structured facts into a short, sendable message."""

from __future__ import annotations

import os

import anthropic

MODEL = os.environ.get("CLAUDE_MODEL", "claude-opus-5")
EFFORT = os.environ.get("CLAUDE_EFFORT", "low")

SYSTEM = (
    "You draft short text messages that the user will paste into a chat, email, or DM as-is. "
    "Write in the first person as the user, in a friendly, natural tone. "
    "Keep it to one short paragraph (at most 3 sentences). "
    "Output only the message text: no preamble, no quotes, no markdown, no sign-off name."
)

_client = anthropic.Anthropic()


def draft(instructions: str) -> str:
    response = _client.beta.messages.create(
        model=MODEL,
        max_tokens=2000,
        system=SYSTEM,
        thinking={"type": "adaptive"},
        output_config={"effort": EFFORT},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        messages=[{"role": "user", "content": instructions}],
    )
    if response.stop_reason == "refusal":
        raise RuntimeError("The model declined to draft this message.")
    text = "".join(block.text for block in response.content if block.type == "text").strip()
    if not text:
        raise RuntimeError("The model returned an empty message.")
    return text
