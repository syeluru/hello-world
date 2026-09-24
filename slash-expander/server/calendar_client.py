"""Google Calendar free/busy lookup using a stored OAuth refresh token."""

from __future__ import annotations

import os
from datetime import datetime

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/calendar.freebusy"]


def _service():
    creds = Credentials(
        token=None,
        refresh_token=os.environ["GOOGLE_REFRESH_TOKEN"],
        client_id=os.environ["GOOGLE_CLIENT_ID"],
        client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
        token_uri="https://oauth2.googleapis.com/token",
        scopes=SCOPES,
    )
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def calendar_ids() -> list[str]:
    return [c.strip() for c in os.environ.get("GOOGLE_CALENDAR_IDS", "primary").split(",") if c.strip()]


def busy_intervals(start: datetime, end: datetime) -> list[tuple[datetime, datetime]]:
    """Busy blocks across all configured calendars. Only times are fetched, never event titles."""
    body = {
        "timeMin": start.isoformat(),
        "timeMax": end.isoformat(),
        "timeZone": str(start.tzinfo),
        "items": [{"id": cid} for cid in calendar_ids()],
    }
    result = _service().freebusy().query(body=body).execute()
    intervals = []
    for cal in result.get("calendars", {}).values():
        for block in cal.get("busy", []):
            intervals.append(
                (
                    datetime.fromisoformat(block["start"].replace("Z", "+00:00")).astimezone(start.tzinfo),
                    datetime.fromisoformat(block["end"].replace("Z", "+00:00")).astimezone(start.tzinfo),
                )
            )
    return intervals
