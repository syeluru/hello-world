"""Slack slash commands: `/availability-tomorrow` (or `/draft availability-tomorrow`).

Slack needs an answer within 3 seconds, so we acknowledge right away with a
"Drafting…" note, then post an ephemeral preview with Send / Regenerate / Cancel.
Send posts the text to the channel as you when SLACK_USER_TOKEN is set, and
otherwise as the app.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
from urllib.parse import parse_qs
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from commands import COMMANDS

router = APIRouter(prefix="/slack")


def verify_signature(body: bytes, timestamp: str, signature: str) -> bool:
    secret = os.environ.get("SLACK_SIGNING_SECRET", "")
    if not secret or not timestamp.isdigit() or abs(time.time() - int(timestamp)) > 300:
        return False
    base = b"v0:" + timestamp.encode() + b":" + body
    expected = "v0=" + hmac.new(secret.encode(), base, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


async def _verified_form(request: Request) -> dict[str, str]:
    body = await request.body()
    if not verify_signature(
        body,
        request.headers.get("X-Slack-Request-Timestamp", ""),
        request.headers.get("X-Slack-Signature", ""),
    ):
        raise HTTPException(status_code=401, detail="Bad Slack signature")
    return {k: v[0] for k, v in parse_qs(body.decode()).items()}


def _user_allowed(user_id: str) -> bool:
    allowed = {u.strip() for u in os.environ.get("SLACK_ALLOWED_USER_IDS", "").split(",") if u.strip()}
    return not allowed or user_id in allowed


def post_json(url: str, payload: dict, token: str | None = None) -> dict:
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    resp = httpx.post(url, json=payload, headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}


def user_timezone(user_id: str) -> ZoneInfo:
    fallback = ZoneInfo(os.environ.get("USER_TIMEZONE", "America/New_York"))
    token = os.environ.get("SLACK_BOT_TOKEN")
    if not token:
        return fallback
    try:
        resp = httpx.get(
            "https://slack.com/api/users.info",
            params={"user": user_id},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        ).json()
        return ZoneInfo(resp["user"]["tz"])
    except (httpx.HTTPError, KeyError, ZoneInfoNotFoundError):
        return fallback


def preview_blocks(command: str, text: str) -> list[dict]:
    return [
        {"type": "section", "text": {"type": "mrkdwn", "text": text}},
        {
            "type": "actions",
            "elements": [
                {"type": "button", "action_id": "send", "text": {"type": "plain_text", "text": "Send"},
                 "style": "primary", "value": text},
                {"type": "button", "action_id": "regenerate", "text": {"type": "plain_text", "text": "Regenerate"},
                 "value": command},
                {"type": "button", "action_id": "cancel", "text": {"type": "plain_text", "text": "Cancel"},
                 "value": "cancel"},
            ],
        },
        {"type": "context", "elements": [{"type": "mrkdwn", "text": f"Draft from `/{command}`. Only you can see this."}]},
    ]


def draft_and_preview(command: str, user_id: str, response_url: str, replace: bool) -> None:
    try:
        text = COMMANDS[command](user_timezone(user_id))
        payload = {"response_type": "ephemeral", "replace_original": replace,
                   "text": text, "blocks": preview_blocks(command, text)}
    except Exception as exc:  # surface any failure to the user instead of failing silently
        payload = {"response_type": "ephemeral", "replace_original": replace,
                   "text": f":warning: Couldn't draft `/{command}`: {exc}"}
    post_json(response_url, payload)


def send_as_user(channel_id: str, text: str, response_url: str) -> None:
    user_token = os.environ.get("SLACK_USER_TOKEN")
    if user_token:
        result = post_json("https://slack.com/api/chat.postMessage", {"channel": channel_id, "text": text}, user_token)
        if not result.get("ok", False):
            post_json(response_url, {"response_type": "ephemeral", "replace_original": True,
                                     "text": f":warning: Slack refused the post: {result.get('error')}"})
            return
    else:
        post_json(response_url, {"response_type": "in_channel", "replace_original": False, "text": text})
    post_json(response_url, {"delete_original": True})


@router.post("/commands")
async def slash_command(request: Request, background: BackgroundTasks) -> dict:
    form = await _verified_form(request)
    if not _user_allowed(form.get("user_id", "")):
        return {"response_type": "ephemeral", "text": "Sorry, this command is private to its owner."}

    # `/availability-tomorrow` maps directly; `/draft availability-tomorrow` uses the argument.
    command = form.get("command", "").lstrip("/").lower()
    if command not in COMMANDS:
        command = form.get("text", "").strip().lstrip("/").lower()
    if command not in COMMANDS:
        options = ", ".join(f"`{c}`" for c in sorted(COMMANDS))
        return {"response_type": "ephemeral", "text": f"Unknown command. Try one of: {options}"}

    background.add_task(draft_and_preview, command, form["user_id"], form["response_url"], False)
    return {"response_type": "ephemeral", "text": f":sparkles: Drafting `/{command}`…"}


@router.post("/interactions")
async def interaction(request: Request, background: BackgroundTasks) -> dict:
    form = await _verified_form(request)
    payload = json.loads(form["payload"])
    user_id = payload["user"]["id"]
    if not _user_allowed(user_id):
        return {}
    action = payload["actions"][0]
    response_url = payload["response_url"]

    if action["action_id"] == "send":
        background.add_task(send_as_user, payload["channel"]["id"], action["value"], response_url)
    elif action["action_id"] == "regenerate" and action["value"] in COMMANDS:
        background.add_task(draft_and_preview, action["value"], user_id, response_url, True)
    elif action["action_id"] == "cancel":
        background.add_task(post_json, response_url, {"delete_original": True})
    return {}
