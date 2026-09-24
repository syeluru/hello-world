"""HTTP endpoint the iOS keyboard / Shortcut calls to expand a /command.

Run:  uvicorn app:app --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import hmac
import os
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel

from commands import COMMANDS

app = FastAPI(title="Slash Expander")


def require_token(authorization: str = Header(default="")) -> None:
    expected = os.environ.get("EXPANDER_TOKEN", "")
    if not expected or not hmac.compare_digest(authorization, f"Bearer {expected}"):
        raise HTTPException(status_code=401, detail="Unauthorized")


class ExpandRequest(BaseModel):
    command: str
    timezone: str | None = None


class ExpandResponse(BaseModel):
    text: str


@app.get("/commands", dependencies=[Depends(require_token)])
def list_commands() -> list[str]:
    return sorted(COMMANDS)


@app.post("/expand", response_model=ExpandResponse, dependencies=[Depends(require_token)])
def expand(req: ExpandRequest) -> ExpandResponse:
    name = req.command.strip().lstrip("/").lower()
    handler = COMMANDS.get(name)
    if handler is None:
        raise HTTPException(status_code=404, detail=f"Unknown command /{name}")
    try:
        tz = ZoneInfo(req.timezone or os.environ.get("USER_TIMEZONE", "America/New_York"))
    except ZoneInfoNotFoundError:
        raise HTTPException(status_code=400, detail=f"Unknown timezone {req.timezone}")
    return ExpandResponse(text=handler(tz))
