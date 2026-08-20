"""
Grocery voice hub.

Flow:
    NFC tap -> iPhone Shortcut records audio -> POSTs it here
    -> local Whisper transcribes -> Claude extracts items
    -> items written to Apple Reminders on this Mac -> audio deleted.

Audio never leaves this machine: transcription is local, and only the
resulting text is sent to the Claude API.

Run:
    uvicorn server:app --host 0.0.0.0 --port 8765
"""

from __future__ import annotations

import json
import logging
import os
import secrets
import subprocess
import tempfile
from pathlib import Path
from typing import Literal

import anthropic
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from faster_whisper import WhisperModel
from pydantic import BaseModel, ValidationError

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("grocery-hub")

# --- Configuration -----------------------------------------------------------

AUTH_TOKEN = os.environ.get("GROCERY_TOKEN")
REMINDERS_LIST = os.environ.get("REMINDERS_LIST", "Groceries")
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "small.en")
MODEL = "claude-opus-5"

if not AUTH_TOKEN:
    raise SystemExit("GROCERY_TOKEN must be set — it is the only thing guarding this endpoint.")

app = FastAPI(title="Grocery Voice Hub")
claude = anthropic.Anthropic()

# Loaded once at import; transcription is serialized by FastAPI's threadpool
# handoff below, which is fine for a single-household request rate.
log.info("Loading Whisper model %s (first run downloads weights)...", WHISPER_MODEL)
whisper = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
log.info("Whisper ready.")


# --- Extraction schema -------------------------------------------------------

class GroceryItem(BaseModel):
    name: str
    quantity: str | None = None
    action: Literal["add", "remove"]


class GroceryUpdate(BaseModel):
    items: list[GroceryItem]


# Hand-written rather than generated from the Pydantic model so the schema stays
# flat — structured outputs want no $ref indirection.
ITEM_SCHEMA = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "The grocery item, singular and lowercase, no quantity.",
                    },
                    "quantity": {
                        "type": ["string", "null"],
                        "description": "Amount as spoken, e.g. '2 lbs', 'a dozen'. Null if unspecified.",
                    },
                    "action": {
                        "type": "string",
                        "enum": ["add", "remove"],
                    },
                },
                "required": ["name", "quantity", "action"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["items"],
    "additionalProperties": False,
}

SYSTEM_PROMPT = """You turn a spoken grocery note into structured list changes.

Rules:
- Split compound speech into separate items: "milk eggs and bananas" is three items.
- Keep brand or variety detail that matters: "oat milk", "sourdough bread".
- Normalize to singular lowercase: "Bananas" -> "banana", "Eggs" -> "egg".
- Capture quantity separately when spoken; never fold it into the name.
- action is "remove" when the speaker says they no longer need something
  ("we already have milk", "take eggs off the list"); otherwise "add".
- Ignore filler and self-corrections. If the speaker changes their mind
  ("milk, actually no, oat milk"), keep only the final intent.
- If nothing resembling a grocery item was said, return an empty items list.
"""


# --- Reminders (AppleScript) -------------------------------------------------

ADD_SCRIPT = """
on run argv
    set listName to item 1 of argv
    set itemName to item 2 of argv
    tell application "Reminders"
        set targetList to list listName
        make new reminder at end of targetList with properties {name:itemName}
    end tell
end run
"""

# Completing rather than deleting: recoverable if the transcription misheard.
REMOVE_SCRIPT = """
on run argv
    set listName to item 1 of argv
    set itemName to item 2 of argv
    set hits to 0
    tell application "Reminders"
        set targetList to list listName
        repeat with r in (every reminder in targetList whose completed is false)
            if (name of r as string) contains itemName then
                set completed of r to true
                set hits to hits + 1
            end if
        end repeat
    end tell
    return hits
end run
"""


def run_applescript(script: str, *args: str) -> str:
    """Run AppleScript with arguments passed via argv, never string-interpolated."""
    result = subprocess.run(
        ["osascript", "-e", script, *args],
        capture_output=True,
        text=True,
        timeout=20,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "osascript failed")
    return result.stdout.strip()


def apply_to_reminders(update: GroceryUpdate) -> dict[str, list[str]]:
    added: list[str] = []
    removed: list[str] = []
    failed: list[str] = []

    for item in update.items:
        label = f"{item.quantity} {item.name}".strip() if item.quantity else item.name
        try:
            if item.action == "add":
                run_applescript(ADD_SCRIPT, REMINDERS_LIST, label)
                added.append(label)
            else:
                hits = run_applescript(REMOVE_SCRIPT, REMINDERS_LIST, item.name)
                if hits and hits != "0":
                    removed.append(item.name)
        except (RuntimeError, subprocess.TimeoutExpired) as exc:
            log.error("Reminders write failed for %r: %s", label, exc)
            failed.append(label)

    return {"added": added, "removed": removed, "failed": failed}


# --- Pipeline stages ---------------------------------------------------------

def transcribe(path: Path) -> str:
    segments, _info = whisper.transcribe(str(path), language="en", vad_filter=True)
    return " ".join(segment.text.strip() for segment in segments).strip()


def extract_items(transcript: str) -> GroceryUpdate:
    response = claude.messages.create(
        model=MODEL,
        max_tokens=4000,
        system=SYSTEM_PROMPT,
        output_config={
            "format": {"type": "json_schema", "schema": ITEM_SCHEMA},
            "effort": "low",  # short extraction; keeps the tap-to-done latency down
        },
        messages=[{"role": "user", "content": transcript}],
    )

    if response.stop_reason == "refusal":
        detail = response.stop_details.explanation if response.stop_details else "refused"
        raise HTTPException(status_code=502, detail=f"Model declined: {detail}")

    text = next((b.text for b in response.content if b.type == "text"), None)
    if not text:
        raise HTTPException(status_code=502, detail="Model returned no content")

    try:
        return GroceryUpdate.model_validate_json(text)
    except ValidationError as exc:
        log.error("Schema validation failed on %r: %s", text, exc)
        raise HTTPException(status_code=502, detail="Could not parse model output") from exc


def process(path: Path) -> dict:
    transcript = transcribe(path)
    log.info("Transcript: %r", transcript)

    if not transcript:
        return {"transcript": "", "added": [], "removed": [], "failed": []}

    update = extract_items(transcript)
    result = apply_to_reminders(update)
    return {"transcript": transcript, **result}


# --- HTTP --------------------------------------------------------------------

@app.get("/health")
def health() -> dict:
    return {"ok": True, "list": REMINDERS_LIST, "whisper": WHISPER_MODEL}


@app.post("/grocery")
async def grocery(
    file: UploadFile = File(...),
    x_grocery_token: str | None = Header(default=None),
) -> dict:
    if not x_grocery_token or not secrets.compare_digest(x_grocery_token, AUTH_TOKEN):
        raise HTTPException(status_code=401, detail="Bad or missing token")

    audio = await file.read()
    if not audio:
        raise HTTPException(status_code=400, detail="Empty upload")

    suffix = Path(file.filename or "clip.m4a").suffix or ".m4a"
    tmp = Path(tempfile.mkstemp(suffix=suffix, prefix="grocery-")[1])

    try:
        tmp.write_bytes(audio)
        result = await run_in_threadpool(process, tmp)
    except HTTPException:
        raise
    except anthropic.RateLimitError as exc:
        raise HTTPException(status_code=429, detail="Rate limited, try again") from exc
    except anthropic.APIStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Claude API error {exc.status_code}") from exc
    except anthropic.APIConnectionError as exc:
        raise HTTPException(status_code=503, detail="Cannot reach Claude API") from exc
    except Exception as exc:  # noqa: BLE001 - surface anything else as a 500 with context
        log.exception("Pipeline failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        tmp.unlink(missing_ok=True)

    log.info("Result: %s", json.dumps(result))

    parts = []
    if result["added"]:
        parts.append("Added " + ", ".join(result["added"]))
    if result["removed"]:
        parts.append("Removed " + ", ".join(result["removed"]))
    if result["failed"]:
        parts.append("Failed " + ", ".join(result["failed"]))
    result["summary"] = " · ".join(parts) or "Nothing recognized"

    return result
