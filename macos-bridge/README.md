# macOS Bridge — Reminders + iMessage ↔ Home Assistant

Home Assistant runs inside a VM and cannot touch Reminders or Messages. This
small service runs **natively on macOS**, where both live, and exposes an HTTP
API that Home Assistant calls.

```
  HOME ASSISTANT (VM)                    macOS HOST
  ───────────────────                    ──────────
  kitchen button  ─────┐
  staples calendar ────┼──► HTTP ──►  bridge.py ──┬──► Reminders  (source of truth)
  store geofence  ─────┘                          ├──► Messages   (send)
                                                  └──◄─ chat.db   (read replies)
```

**Reminders is the source of truth.** The bridge writes into it and reads from
it, and never keeps a competing copy. Whatever the family sees in the Reminders
app is real.

## What it does

| Trigger | Behavior |
|---|---|
| Kitchen button says "we're out of milk" | Adds *Milk* to the shared Reminders list |
| Someone has been inside a store geofence 5 minutes | Scans the last 30 minutes of designated message threads for grocery requests, merges them into the list, then texts the full list to the family thread |
| Someone texts "also grab bananas" during the trip | Adds it and confirms, so the shopper sees it mid-aisle |
| 10 minutes after leaving the store | If anything is still unchecked, asks what was picked up |
| Reply: "got milk and eggs, couldn't get yogurt" | Marks milk and eggs done; flags yogurt as unavailable at that store |

## Setup

### 1. Permissions (the fiddly part — do this first)

The bridge needs three grants in **System Settings → Privacy & Security**:

- **Full Disk Access** → add your terminal app *and* `/usr/bin/python3`.
  Required to read the Messages database. Without it you get a silent
  permission error on `chat.db`.
- **Automation** → allow the terminal to control **Reminders** and **Messages**.
  macOS prompts the first time; if you miss the prompt, the calls fail quietly.
- **Contacts** (optional) → nicer sender names in logs.

Sign into Messages and iCloud on this Mac, and keep it awake.

### 2. Configure

```bash
cd macos-bridge
cp config.example.json config.json
```

Edit `config.json`:

- `reminders_list` — must match the shared list name in Reminders exactly
- `send_to` — the thread that receives the shopping list (see below)
- `watch_threads` — the group chat and DMs to scan for grocery requests
- `anthropic_api_key` — used for relevance filtering and reply parsing

**Finding a group chat ID:** run `python3 bridge.py --list-chats`. It prints
recent conversations with their identifiers and participants. Copy the one you
want. DMs are just phone numbers or emails.

### 3. Run it

```bash
python3 bridge.py            # foreground, for testing
```

Check it works:

```bash
curl localhost:8787/health
curl -X POST localhost:8787/add -d '{"item":"Milk","quantity":"2 gal"}'
```

Then install it as a background service that survives reboots:

```bash
cp com.household.bridge.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.household.bridge.plist
```

### 4. Point Home Assistant at it

Copy `../kitchen-automation/homeassistant/packages/grocery_trip.yaml` into your
HA `packages/` directory and set `bridge_host` to the Mac's LAN IP.

## Privacy

The bridge reads message threads you explicitly list, and only messages from
the last 30 minutes of an active shopping window. Before anything is sent to a
language model, a **local keyword filter** discards messages with no plausible
grocery signal — so ordinary conversation never leaves the machine. Nothing is
stored beyond the current trip.

Tell the people in those threads that this exists. It's their messages too.

To disable message reading entirely and keep only the list-sending half, set
`"watch_threads": []`.

## Known limits

- The Mac must be awake and signed into Messages. If it sleeps, the chain stops.
- Apple provides no iMessage API; this drives the Messages app through
  AppleScript, which occasionally breaks across macOS releases.
- Reminders via AppleScript is slow — expect a second or two per operation.
- Group chat IDs change if the group is recreated.
