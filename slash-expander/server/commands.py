"""Slash commands. Each command gathers facts and asks Claude to phrase them."""

from __future__ import annotations

import os
from datetime import date, datetime, time, timedelta
from typing import Callable
from zoneinfo import ZoneInfo

import calendar_client
import llm
from availability import free_slots

WORK_START = int(os.environ.get("WORK_START_HOUR", "9"))
WORK_END = int(os.environ.get("WORK_END_HOUR", "18"))
MIN_SLOT_MINUTES = int(os.environ.get("MIN_SLOT_MINUTES", "30"))


def _availability_prompt(day: date, tz: ZoneInfo, day_word: str) -> str:
    start = datetime.combine(day, time(WORK_START), tzinfo=tz)
    end = datetime.combine(day, time(WORK_END), tzinfo=tz)
    slots = free_slots(calendar_client.busy_intervals(start, end), start, end, MIN_SLOT_MINUTES)
    if slots:
        facts = "Free windows: " + "; ".join(s.label() for s in slots)
    else:
        facts = "No free windows at all during working hours."
    return (
        f"Draft a message sharing my availability for {day_word} "
        f"({day.strftime('%A, %B %-d')}), times in {tz.key}. "
        f"My working hours are {WORK_START}:00–{WORK_END}:00. {facts}. "
        "List the windows compactly; if there are none, say I'm booked and offer to find another day."
    )


def _availability(offset_days: int, day_word: str) -> Callable[[ZoneInfo], str]:
    def run(tz: ZoneInfo) -> str:
        day = datetime.now(tz).date() + timedelta(days=offset_days)
        return llm.draft(_availability_prompt(day, tz, day_word))

    return run


COMMANDS: dict[str, Callable[[ZoneInfo], str]] = {
    "availability-today": _availability(0, "today"),
    "availability-tomorrow": _availability(1, "tomorrow"),
}
