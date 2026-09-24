from datetime import datetime
from zoneinfo import ZoneInfo

from availability import free_slots

TZ = ZoneInfo("America/New_York")


def at(h, m=0):
    return datetime(2026, 9, 25, h, m, tzinfo=TZ)


def test_gaps_between_overlapping_and_out_of_window_events():
    busy = [(at(8), at(10)), (at(11), at(12)), (at(11, 30), at(13)), (at(17, 45), at(19))]
    slots = free_slots(busy, at(9), at(18))
    assert [s.label() for s in slots] == ["10am–11am", "1pm–5:45pm"]


def test_short_gaps_are_dropped():
    busy = [(at(9), at(10)), (at(10, 15), at(18))]
    assert free_slots(busy, at(9), at(18), min_minutes=30) == []


def test_empty_calendar_is_whole_window():
    assert [s.label() for s in free_slots([], at(9), at(18))] == ["9am–6pm"]
