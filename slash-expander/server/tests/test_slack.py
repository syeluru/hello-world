import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import pytest
from fastapi.testclient import TestClient

import app as app_module
import commands
import slack

client = TestClient(app_module.app)
SECRET = "signing-secret"


def signed(body: str, secret: str = SECRET) -> dict:
    ts = str(int(time.time()))
    sig = "v0=" + hmac.new(secret.encode(), f"v0:{ts}:{body}".encode(), hashlib.sha256).hexdigest()
    return {"X-Slack-Request-Timestamp": ts, "X-Slack-Signature": sig,
            "Content-Type": "application/x-www-form-urlencoded"}


@pytest.fixture
def posts(monkeypatch):
    monkeypatch.setenv("SLACK_SIGNING_SECRET", SECRET)
    monkeypatch.delenv("SLACK_BOT_TOKEN", raising=False)
    monkeypatch.delenv("SLACK_USER_TOKEN", raising=False)
    monkeypatch.delenv("SLACK_ALLOWED_USER_IDS", raising=False)
    monkeypatch.setitem(commands.COMMANDS, "availability-tomorrow", lambda tz: f"Free 2–4pm ({tz.key})")
    sent = []
    monkeypatch.setattr(slack, "post_json", lambda url, payload, token=None: sent.append((url, payload, token)) or {"ok": True})
    return sent


def command_body(command="/availability-tomorrow", text="", user="U1"):
    return urlencode({"command": command, "text": text, "user_id": user, "channel_id": "C1",
                      "response_url": "https://hooks.slack.test/resp"})


def test_slash_command_acks_then_posts_preview(posts):
    body = command_body()
    resp = client.post("/slack/commands", content=body, headers=signed(body))
    assert resp.status_code == 200
    assert "Drafting" in resp.json()["text"]
    url, payload, _ = posts[-1]
    assert url == "https://hooks.slack.test/resp"
    assert payload["text"] == "Free 2–4pm (America/New_York)"
    assert [e["action_id"] for e in payload["blocks"][1]["elements"]] == ["send", "regenerate", "cancel"]


def test_generic_draft_command_uses_argument(posts):
    body = command_body(command="/draft", text="availability-tomorrow")
    resp = client.post("/slack/commands", content=body, headers=signed(body))
    assert "Drafting" in resp.json()["text"]
    assert posts[-1][1]["text"].startswith("Free")


def test_rejects_bad_signature(posts):
    body = command_body()
    resp = client.post("/slack/commands", content=body, headers=signed(body, secret="wrong"))
    assert resp.status_code == 401
    assert posts == []


def test_other_users_are_blocked(posts, monkeypatch):
    monkeypatch.setenv("SLACK_ALLOWED_USER_IDS", "UOWNER")
    body = command_body(user="USOMEONE")
    resp = client.post("/slack/commands", content=body, headers=signed(body))
    assert "private" in resp.json()["text"]
    assert posts == []


def interaction_body(action_id, value):
    payload = {"user": {"id": "U1"}, "channel": {"id": "C1"}, "response_url": "https://hooks.slack.test/resp",
               "actions": [{"action_id": action_id, "value": value}]}
    return urlencode({"payload": json.dumps(payload)})


def test_send_posts_as_user_when_user_token_set(posts, monkeypatch):
    monkeypatch.setenv("SLACK_USER_TOKEN", "xoxp-1")
    body = interaction_body("send", "Free 2–4pm")
    assert client.post("/slack/interactions", content=body, headers=signed(body)).status_code == 200
    assert posts[0] == ("https://slack.com/api/chat.postMessage", {"channel": "C1", "text": "Free 2–4pm"}, "xoxp-1")
    assert posts[1][1] == {"delete_original": True}


def test_send_falls_back_to_in_channel_without_user_token(posts):
    body = interaction_body("send", "Free 2–4pm")
    client.post("/slack/interactions", content=body, headers=signed(body))
    assert posts[0][1]["response_type"] == "in_channel"
    assert posts[1][1] == {"delete_original": True}


def test_regenerate_replaces_preview(posts):
    body = interaction_body("regenerate", "availability-tomorrow")
    client.post("/slack/interactions", content=body, headers=signed(body))
    assert posts[-1][1]["replace_original"] is True
