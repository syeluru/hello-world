# Grocery Voice Hub

Tap an NFC sticker, say what you need, and it lands in a shared Apple Reminders list.

```
NFC tap → iPhone records audio → POST to this Mac (over Tailscale)
       → local Whisper transcribes → Claude extracts items
       → written to Reminders → audio deleted on both ends
```

Audio never leaves the Mac. Transcription runs locally via Whisper; only the
resulting text goes to the Claude API.

---

## 1. Install on the Mac

```bash
cd grocery-hub
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

First run downloads the Whisper weights (~500 MB for `small.en`). Set
`WHISPER_MODEL=base.en` for a faster, less accurate model.

## 2. Configure

```bash
export ANTHROPIC_API_KEY="sk-ant-..."        # console.anthropic.com
export GROCERY_TOKEN="$(openssl rand -hex 32)"   # save this — the Shortcut needs it
export REMINDERS_LIST="Groceries"            # must already exist in Reminders
```

Create the list in Reminders first and share it with whoever should see it —
the script writes to an existing list, it won't create one.

## 3. First run — grant the Automation permission

Run it **from Terminal** the first time:

```bash
uvicorn server:app --host 0.0.0.0 --port 8765
```

macOS will prompt to let Terminal control Reminders. **You must accept it.** If
you skip this, or later run the server headless before granting it, writes fail
with "Not authorized to send Apple events to Reminders" — and a background
process can't show the prompt. Grant it once from Terminal and it sticks.

Verify end to end:

```bash
curl -s http://127.0.0.1:8765/health
curl -s -X POST http://127.0.0.1:8765/grocery \
  -H "X-Grocery-Token: $GROCERY_TOKEN" \
  -F "file=@test.m4a"
```

## 4. iPhone Shortcut

Create a new Shortcut named "Add to groceries":

1. **Record Audio** — set *Stop Recording* to **On Tap** or **After 10 seconds**
2. **Get Contents of URL**
   - URL: `http://100.86.21.54:8765/grocery` (the Mac's Tailscale IP)
   - Method: **POST**
   - Headers: `X-Grocery-Token` → your `GROCERY_TOKEN`
   - Request Body: **Form**
   - Add field: name `file`, type **File**, value = the Recorded Audio output
3. **Get Dictionary Value** → key `summary`
4. **Show Notification** with that value

Use the raw `100.x` Tailscale IP, not a MagicDNS hostname. Tailscale IPs are
stable for the life of the device registration, and skipping DNS removes a whole
class of failure.

Everyone using this needs to be on the tailnet with the Mac awake.

## 5. NFC trigger

On each phone:

**Shortcuts → Automation → + → NFC → Scan** the sticker → name it →
**Run Immediately**, **Notify When Run** off → action: **Run Shortcut** →
"Add to groceries".

The same sticker can be registered independently on multiple phones; iOS keys
the automation to the tag's hardware UID, so nothing needs to be written to the
tag itself. If the tag has an old NDEF record on it, erase it with NFC Tools so
iOS stops offering to open a URL.

## 6. Keep it running

Copy `com.grocery.hub.plist` to `~/Library/LaunchAgents/`, edit the paths and
environment variables inside it, then:

```bash
launchctl load ~/Library/LaunchAgents/com.grocery.hub.plist
```

Logs go to `/tmp/grocery-hub.log`.

The Mac also has to stay awake to answer. Either set **System Settings → Lock
Screen → Prevent automatic sleeping** (when plugged in), or run the server under
`caffeinate -i`.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `401 Bad or missing token` | Header name or value mismatch in the Shortcut |
| `Not authorized to send Apple events` | Automation permission never granted — run from Terminal once |
| Items land in the wrong list | `REMINDERS_LIST` doesn't match the list name exactly |
| Shortcut hangs, no response | Mac asleep, Tailscale down, or wrong IP |
| `summary` says "Nothing recognized" | Whisper heard nothing — check the recording actually captured audio |
| Slow first request | Whisper weights downloading, or model warming up |

To see what the server actually heard, check its log output — every request
logs the raw transcript before extraction, which is usually enough to tell
whether a miss was transcription or parsing.
