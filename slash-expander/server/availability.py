"""Pure free-slot computation, kept separate from I/O so it is easy to test."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass(frozen=True)
class Slot:
    start: datetime
    end: datetime

    def label(self) -> str:
        return f"{_fmt(self.start)}–{_fmt(self.end)}"


def _fmt(dt: datetime) -> str:
    hour = dt.strftime("%I").lstrip("0")
    minute = dt.strftime("%M")
    suffix = dt.strftime("%p").lower()
    return f"{hour}{suffix}" if minute == "00" else f"{hour}:{minute}{suffix}"


def free_slots(
    busy: list[tuple[datetime, datetime]],
    window_start: datetime,
    window_end: datetime,
    min_minutes: int = 30,
) -> list[Slot]:
    """Return the gaps inside [window_start, window_end] not covered by `busy`."""
    clipped = sorted(
        (max(s, window_start), min(e, window_end))
        for s, e in busy
        if e > window_start and s < window_end
    )
    slots: list[Slot] = []
    cursor = window_start
    for start, end in clipped:
        if start > cursor:
            slots.append(Slot(cursor, start))
        cursor = max(cursor, end)
    if cursor < window_end:
        slots.append(Slot(cursor, window_end))
    min_len = timedelta(minutes=min_minutes)
    return [s for s in slots if s.end - s.start >= min_len]
