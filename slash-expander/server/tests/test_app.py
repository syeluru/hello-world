from datetime import datetime

from fastapi.testclient import TestClient

import app as app_module
import calendar_client
import llm

client = TestClient(app_module.app)
AUTH = {"Authorization": "Bearer secret"}


def test_expand_availability_tomorrow(monkeypatch):
    monkeypatch.setenv("EXPANDER_TOKEN", "secret")
    captured = {}

    def fake_busy(start, end):
        return [(start.replace(hour=12), start.replace(hour=14))]

    def fake_draft(prompt):
        captured["prompt"] = prompt
        return "I'm free 9am–12pm and 2pm–6pm tomorrow."

    monkeypatch.setattr(calendar_client, "busy_intervals", fake_busy)
    monkeypatch.setattr(llm, "draft", fake_draft)

    resp = client.post("/expand", json={"command": "/availability-tomorrow", "timezone": "America/Chicago"}, headers=AUTH)
    assert resp.status_code == 200
    assert resp.json()["text"].startswith("I'm free")
    assert "9am–12pm; 2pm–6pm" in captured["prompt"]
    assert "America/Chicago" in captured["prompt"]


def test_rejects_bad_token(monkeypatch):
    monkeypatch.setenv("EXPANDER_TOKEN", "secret")
    resp = client.post("/expand", json={"command": "availability-tomorrow"}, headers={"Authorization": "Bearer nope"})
    assert resp.status_code == 401


def test_unknown_command(monkeypatch):
    monkeypatch.setenv("EXPANDER_TOKEN", "secret")
    resp = client.post("/expand", json={"command": "/nope"}, headers=AUTH)
    assert resp.status_code == 404
