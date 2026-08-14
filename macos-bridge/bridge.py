#!/usr/bin/env python3
"""
macOS bridge: Reminders + iMessage <-> Home Assistant.

Runs natively on macOS (Home Assistant lives in a VM and cannot reach either
app). Exposes a small HTTP API that Home Assistant calls on geofence and
button events.

Reminders is the source of truth. This service never keeps a competing copy.

Usage:
    python3 bridge.py                 run the service
    python3 bridge.py --list-chats    print recent conversations and their ids
    python3 bridge.py --selftest      exercise Reminders + Messages access

Requires Full Disk Access (to read the Messages database) and Automation
permission for Reminders and Messages. See README.md.
"""

import json
import os
import re
import sqlite3
import subprocess
import sys
import threading
import time
import urllib.request
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, HTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(HERE, "config.json")
CHAT_DB = os.path.expanduser("~/Library/Messages/chat.db")

# Messages timestamps count from 2001-01-01, not the Unix epoch.
APPLE_EPOCH = datetime(2001, 1, 1)


def log(*parts):
    print(f"[{datetime.now():%Y-%m-%d %H:%M:%S}]", *parts, flush=True)


def load_config():
    if not os.path.exists(CONFIG_PATH):
        sys.exit("config.json not found — copy config.example.json and edit it.")
    with open(CONFIG_PATH) as fh:
        return json.load(fh)


CFG = load_config()


# ---------------------------------------------------------------------------
# AppleScript
# ---------------------------------------------------------------------------

def osascript(script):
    """Run AppleScript, returning stdout. Raises on failure with the real error."""
    result = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True, text=True, timeout=60,
    )
    if result.returncode != 0:
        raise RuntimeError(f"AppleScript failed: {result.stderr.strip()}")
    return result.stdout.strip()


def applescript_quote(text):
    """Escape a Python string for safe interpolation into an AppleScript literal."""
    return text.replace("\\", "\\\\").replace('"', '\\"')


# ---------------------------------------------------------------------------
# Reminders — the source of truth
# ---------------------------------------------------------------------------

class Reminders:
    def __init__(self, list_name):
        self.list_name = list_name

    def _list(self):
        return applescript_quote(self.list_name)

    def open_items(self):
        """Return the names of every uncompleted reminder on the list."""
        script = f'''
        tell application "Reminders"
            set outText to ""
            repeat with r in (reminders of list "{self._list()}" whose completed is false)
                set outText to outText & (name of r) & "\\n"
            end repeat
            return outText
        end tell
        '''
        raw = osascript(script)
        return [line.strip() for line in raw.splitlines() if line.strip()]

    def add(self, item, quantity=None, note=None):
        """Add an item, skipping it if an equivalent one is already open."""
        title = f"{item} ({quantity})" if quantity else item

        # Don't create duplicates — the staples calendar and the kitchen button
        # will both reach for the same things.
        for existing in self.open_items():
            if _same_item(existing, item):
                log(f"already on list, skipping: {existing}")
                return False

        props = f'name:"{applescript_quote(title)}"'
        if note:
            props += f', body:"{applescript_quote(note)}"'

        osascript(f'''
        tell application "Reminders"
            make new reminder at end of list "{self._list()}" with properties {{{props}}}
        end tell
        ''')
        log(f"added: {title}")
        return True

    def complete(self, item):
        """Mark the first open reminder matching this item as done."""
        target = self._find_open(item)
        if not target:
            return False
        osascript(f'''
        tell application "Reminders"
            set matches to (reminders of list "{self._list()}" whose name is "{applescript_quote(target)}" and completed is false)
            repeat with r in matches
                set completed of r to true
            end repeat
        end tell
        ''')
        log(f"completed: {target}")
        return True

    def annotate(self, item, note):
        """Leave a note on an item — used to record 'store was out of this'."""
        target = self._find_open(item)
        if not target:
            return False
        osascript(f'''
        tell application "Reminders"
            set matches to (reminders of list "{self._list()}" whose name is "{applescript_quote(target)}" and completed is false)
            repeat with r in matches
                set body of r to "{applescript_quote(note)}"
            end repeat
        end tell
        ''')
        log(f"annotated {target}: {note}")
        return True

    def _find_open(self, item):
        for existing in self.open_items():
            if _same_item(existing, item):
                return existing
        return None


def _same_item(a, b):
    """Loose match so 'Milk (2 gal)' and 'milk' are the same thing."""
    strip = lambda s: re.sub(r"\(.*?\)", "", s).strip().lower().rstrip("s")
    a, b = strip(a), strip(b)
    return a == b or a in b or b in a


# ---------------------------------------------------------------------------
# Messages — reading
# ---------------------------------------------------------------------------

def _decode_attributed_body(blob):
    """
    Newer macOS often leaves message.text NULL and stores the body in an
    archived NSAttributedString. Pull the readable run out of it.
    """
    if not blob:
        return ""
    try:
        raw = blob.decode("utf-8", errors="ignore")
    except Exception:
        return ""
    match = re.search(r"NSString\x01\x94\x84\x01\+(.*?)\x86", raw, re.S)
    if match:
        return match.group(1).strip()
    # Fallback: longest printable run, which is nearly always the message.
    runs = re.findall(r"[ -~\n]{4,}", raw)
    return max(runs, key=len).strip() if runs else ""


def recent_messages(minutes):
    """
    Return recent messages from the configured threads, newest last.
    Each entry: {thread, sender, text, from_me, when}
    """
    if not os.path.exists(CHAT_DB):
        log("chat.db not found — is this a Mac with Messages set up?")
        return []

    watched = CFG.get("watch_threads", [])
    if not watched:
        return []

    since = datetime.now() - timedelta(minutes=minutes)
    since_apple = int((since - APPLE_EPOCH).total_seconds() * 1_000_000_000)
    wanted_ids = {t["id"] for t in watched}
    labels = {t["id"]: t.get("label", t["id"]) for t in watched}

    try:
        # Read-only, and on a copy-free URI so we never write to the live db.
        conn = sqlite3.connect(f"file:{CHAT_DB}?mode=ro", uri=True)
    except sqlite3.OperationalError as exc:
        log(f"cannot open chat.db ({exc}) — grant Full Disk Access")
        return []

    try:
        rows = conn.execute(
            """
            SELECT chat.chat_identifier,
                   chat.guid,
                   handle.id,
                   message.text,
                   message.attributedBody,
                   message.is_from_me,
                   message.date
            FROM message
            JOIN chat_message_join ON message.ROWID = chat_message_join.message_id
            JOIN chat ON chat.ROWID = chat_message_join.chat_id
            LEFT JOIN handle ON message.handle_id = handle.ROWID
            WHERE message.date > ?
            ORDER BY message.date ASC
            """,
            (since_apple,),
        ).fetchall()
    finally:
        conn.close()

    out = []
    for chat_id, guid, handle, text, attributed, from_me, date in rows:
        if chat_id not in wanted_ids and guid not in wanted_ids and handle not in wanted_ids:
            continue
        body = (text or "").strip() or _decode_attributed_body(attributed)
        if not body:
            continue
        key = guid if guid in wanted_ids else (chat_id if chat_id in wanted_ids else handle)
        out.append({
            "thread": labels.get(key, key),
            "sender": "me" if from_me else (handle or "unknown"),
            "text": body,
            "from_me": bool(from_me),
            "when": APPLE_EPOCH + timedelta(seconds=date / 1_000_000_000),
        })
    return out


def looks_grocery_related(text):
    """
    Cheap local gate that runs BEFORE any model sees a message. Ordinary
    conversation never leaves this machine.
    """
    low = text.lower()
    return any(word in low for word in CFG.get("keyword_prefilter", []))


# ---------------------------------------------------------------------------
# Messages — sending
# ---------------------------------------------------------------------------

def send_message(text, target=None):
    target = target or CFG["send_to"]
    body = applescript_quote(text)

    if target["kind"] == "chat":
        script = f'''
        tell application "Messages"
            send "{body}" to chat id "{applescript_quote(target["id"])}"
        end tell
        '''
    else:
        script = f'''
        tell application "Messages"
            set svc to 1st account whose service type = iMessage
            send "{body}" to participant "{applescript_quote(target["id"])}" of svc
        end tell
        '''
    osascript(script)
    log(f"sent to {target['id']}: {text[:60]}...")


# ---------------------------------------------------------------------------
# Language model
# ---------------------------------------------------------------------------

def ask_model(system, user, max_tokens=1024):
    payload = json.dumps({
        "model": CFG.get("model", "claude-sonnet-5"),
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }).encode()

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "content-type": "application/json",
            "x-api-key": CFG["anthropic_api_key"],
            "anthropic-version": "2023-06-01",
        },
    )
    with urllib.request.urlopen(req, timeout=45) as resp:
        data = json.loads(resp.read())
    return data["content"][0]["text"]


def _json_from(text):
    """Models sometimes wrap JSON in prose or fences. Dig it out."""
    match = re.search(r"\{.*\}|\[.*\]", text, re.S)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def extract_requests(messages):
    """
    Given already-prefiltered messages, return grocery items people asked for.
    Returns [{item, quantity}].
    """
    if not messages:
        return []

    transcript = "\n".join(
        f"[{m['thread']}] {'me' if m['from_me'] else m['sender']}: {m['text']}"
        for m in messages
    )

    reply = ask_model(
        system=(
            "You extract grocery shopping requests from family text messages. "
            "Only include things someone is asking to be bought or saying the "
            "household is out of. Ignore everything else, including plans, "
            "logistics, and mentions of food being eaten or cooked. "
            "Respond with JSON only: "
            '{"items":[{"item":"milk","quantity":"2 gal"}]}. '
            "Use null for quantity when none is stated. Return an empty list "
            "if nothing is being requested."
        ),
        user=f"Messages:\n{transcript}",
    )
    parsed = _json_from(reply) or {}
    return parsed.get("items", [])


def parse_haul(reply_text, outstanding):
    """
    Parse a reply like "got milk and eggs, couldn't get yogurt".
    Returns {"got": [...], "missing": [...]}.
    """
    result = ask_model(
        system=(
            "The user just returned from grocery shopping and is reporting what "
            "they bought. Match their reply against the outstanding list. "
            "Respond with JSON only: "
            '{"got":["Milk"],"missing":["Yogurt"]}. '
            "Use the exact strings from the outstanding list. Items they did "
            "not mention at all belong in neither array. If they say something "
            "like 'got everything', put every outstanding item in got."
        ),
        user=f"Outstanding list: {json.dumps(outstanding)}\n\nTheir reply: {reply_text}",
    )
    parsed = _json_from(result) or {}
    return {"got": parsed.get("got", []), "missing": parsed.get("missing", [])}


# ---------------------------------------------------------------------------
# Trip orchestration
# ---------------------------------------------------------------------------

REM = Reminders(CFG["reminders_list"])


class Trip:
    """Tracks one shopping trip and watches for additions while it's running."""

    def __init__(self):
        self.active = False
        self.started = None
        self.person = None
        self.seen_texts = set()
        self._stop = threading.Event()

    def start(self, person):
        if self.active:
            log("trip already running, ignoring duplicate start")
            return
        self.active = True
        self.started = datetime.now()
        self.person = person
        self._stop.clear()
        log(f"trip started ({person})")

        # Fold in anything requested shortly before arriving.
        window = CFG.get("lookback_minutes", 30)
        self._absorb_requests(recent_messages(window))

        items = REM.open_items()
        if items:
            body = "\n".join(f"• {i}" for i in items)
            send_message(f"🛒 Shopping list ({len(items)})\n{body}")
        else:
            send_message("🛒 At the store — the list is empty.")

        threading.Thread(target=self._watch, daemon=True).start()

    def _watch(self):
        """While the trip runs, pick up 'also grab X' messages from home."""
        while not self._stop.wait(45):
            try:
                fresh = [
                    m for m in recent_messages(3)
                    if m["text"] not in self.seen_texts
                ]
                added = self._absorb_requests(fresh)
                if added:
                    names = ", ".join(added)
                    send_message(f"➕ Added: {names}")
            except Exception as exc:
                log(f"watch loop error: {exc}")

    def _absorb_requests(self, messages):
        """Prefilter locally, then extract items and add them. Returns names added."""
        for m in messages:
            self.seen_texts.add(m["text"])

        candidates = [m for m in messages if looks_grocery_related(m["text"])]
        if not candidates:
            return []

        added = []
        try:
            for entry in extract_requests(candidates):
                item = (entry.get("item") or "").strip()
                if item and REM.add(item, entry.get("quantity")):
                    added.append(item)
        except Exception as exc:
            log(f"extraction failed: {exc}")
        return added

    def end(self):
        if not self.active:
            return
        self._stop.set()
        self.active = False
        log("trip ended")

        outstanding = REM.open_items()
        if not outstanding:
            # Everything was ticked off in Reminders while shopping. Say nothing —
            # the whole point is not to make people do the work twice.
            log("list already clear, no follow-up needed")
            return

        body = "\n".join(f"• {i}" for i in outstanding)
        send_message(
            f"Still on the list — did you get these?\n{body}\n\n"
            "Reply naturally, e.g. \"got the milk and eggs, they were out of yogurt\"."
        )
        threading.Thread(target=self._await_reply, args=(outstanding,), daemon=True).start()

    def _await_reply(self, outstanding):
        """Watch for a reply for a while, then give up quietly."""
        deadline = time.time() + 45 * 60
        asked_at = datetime.now()

        while time.time() < deadline:
            time.sleep(60)
            replies = [
                m for m in recent_messages(3)
                if m["when"] > asked_at and m["text"] not in self.seen_texts
            ]
            for m in replies:
                self.seen_texts.add(m["text"])
            if not replies:
                continue

            text = " ".join(m["text"] for m in replies)
            try:
                verdict = parse_haul(text, outstanding)
            except Exception as exc:
                log(f"haul parse failed: {exc}")
                continue

            for item in verdict["got"]:
                REM.complete(item)
            for item in verdict["missing"]:
                REM.annotate(item, f"Unavailable on {datetime.now():%b %d}")

            summary = []
            if verdict["got"]:
                summary.append(f"crossed off {len(verdict['got'])}")
            if verdict["missing"]:
                summary.append(f"kept {len(verdict['missing'])} (store was out)")
            if summary:
                send_message("✅ Updated — " + ", ".join(summary) + ".")
                return

        log("no reply to the haul question; leaving the list untouched")


TRIP = Trip()


# ---------------------------------------------------------------------------
# HTTP API
# ---------------------------------------------------------------------------

class Handler(BaseHTTPRequestHandler):
    def _reply(self, code, payload):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if not length:
            return {}
        try:
            return json.loads(self.rfile.read(length))
        except json.JSONDecodeError:
            return {}

    def do_GET(self):
        if self.path == "/health":
            self._reply(200, {"ok": True, "trip_active": TRIP.active})
        elif self.path == "/list":
            self._reply(200, {"items": REM.open_items()})
        else:
            self._reply(404, {"error": "unknown endpoint"})

    def do_POST(self):
        data = self._body()
        try:
            if self.path == "/add":
                item = (data.get("item") or "").strip()
                if not item:
                    return self._reply(400, {"error": "item is required"})
                added = REM.add(item, data.get("quantity"))
                self._reply(200, {"added": added, "item": item})

            elif self.path == "/trip/start":
                TRIP.start(data.get("person", "someone"))
                self._reply(200, {"started": True})

            elif self.path == "/trip/end":
                TRIP.end()
                self._reply(200, {"ended": True})

            else:
                self._reply(404, {"error": "unknown endpoint"})
        except Exception as exc:
            log(f"error handling {self.path}: {exc}")
            self._reply(500, {"error": str(exc)})

    def log_message(self, *args):
        pass  # our own logging is enough


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def list_chats():
    """Print recent conversations so you can find ids for config.json."""
    conn = sqlite3.connect(f"file:{CHAT_DB}?mode=ro", uri=True)
    rows = conn.execute(
        """
        SELECT chat.guid, chat.chat_identifier, chat.display_name,
               COUNT(message.ROWID) AS n, MAX(message.date)
        FROM chat
        JOIN chat_message_join ON chat.ROWID = chat_message_join.chat_id
        JOIN message ON message.ROWID = chat_message_join.message_id
        GROUP BY chat.ROWID
        ORDER BY MAX(message.date) DESC
        LIMIT 30
        """
    ).fetchall()
    conn.close()

    print(f"{'messages':>9}  {'name':<24} id")
    print("-" * 90)
    for guid, ident, name, count, _ in rows:
        label = name or ident or "(unnamed)"
        chosen = guid if guid and guid.startswith("iMessage;+;chat") else (ident or guid)
        print(f"{count:>9}  {label[:24]:<24} {chosen}")


def selftest():
    print("Reminders list:", CFG["reminders_list"])
    print("  open items:", REM.open_items())
    msgs = recent_messages(60)
    print(f"Messages: {len(msgs)} in the last hour from watched threads")
    relevant = [m for m in msgs if looks_grocery_related(m["text"])]
    print(f"  {len(relevant)} passed the local grocery prefilter")


def main():
    if "--list-chats" in sys.argv:
        return list_chats()
    if "--selftest" in sys.argv:
        return selftest()

    port = CFG.get("listen_port", 8787)
    log(f"bridge listening on 0.0.0.0:{port}")
    log(f"reminders list: {CFG['reminders_list']}")
    log(f"watching {len(CFG.get('watch_threads', []))} threads")
    HTTPServer(("0.0.0.0", port), Handler).serve_forever()


if __name__ == "__main__":
    main()
