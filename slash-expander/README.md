# Slash Expander: text replacement backed by an LLM

iOS Text Replacement can only swap in fixed text; it can't run code. This project
gets you the same "type a shortcut, get text" feel, except the replacement is
generated on the fly by Claude from live data such as your Google Calendar.

```
you type:   Sure, here's when I'm around /availability-tomorrow
you get:    Sure, here's when I'm around I'm free tomorrow (Thu, Sep 25) from
            9–11am, 1–2:30pm and after 4pm ET. Happy to grab whichever works for you!
```

## How it works

```
iPhone (any app)                       Your server                      APIs
┌────────────────────┐   POST /expand  ┌───────────────────────┐  free/busy  ┌─────────────────┐
│ SlashKeyboard      │ ──────────────▶ │ server/app.py         │ ──────────▶ │ Google Calendar │
│ (keyboard ext.)    │                 │  compute free slots   │             └─────────────────┘
│ or iOS Shortcut    │ ◀────────────── │  ask Claude to phrase │ ──────────▶  Claude API
└────────────────────┘   {"text": …}   └───────────────────────┘
```

1. You type `/availability-tomorrow` with your normal keyboard, then tap 🌐 to switch
   to **SlashKeyboard**.
2. The keyboard reads the `/command` right before the cursor and calls your server.
3. The server reads your Google Calendar **free/busy** for tomorrow's working hours
   (it only reads busy times, never event titles), computes the open windows, and has
   Claude write a short, friendly message of at most 3 sentences.
4. The keyboard deletes the `/command`, inserts the message, and switches you back to
   your normal keyboard.

Two parts are needed because an iOS keyboard shouldn't hold your Google and Anthropic
credentials, and the calendar math is easier to test on a server.

## Slack MVP (works on desktop and in the Slack iPhone app)

Type `/availability-tomorrow` in any Slack message box. Only you see a preview of the draft,
with **Send**, **Regenerate** and **Cancel**. **Send** posts it to the conversation as you.

```
/availability-tomorrow
  ┌──────────────────────────────────────────────────────────────┐
  │ I'm free tomorrow (Thu, Sep 25) 9–11am, 1–2:30pm and after   │
  │ 4pm ET. Happy to grab whichever works for you!               │
  │ [Send]  [Regenerate]  [Cancel]      Only you can see this.   │
  └──────────────────────────────────────────────────────────────┘
```

`/draft availability-tomorrow` works too, so a new server-side command doesn't need a new
Slack command registered.

### Slack setup

1. Do **Google Calendar access** and **Run the server** below first. Slack needs a public
   HTTPS URL for the server.
2. Go to <https://api.slack.com/apps>, then **Create New App › From a manifest**. Pick your
   workspace, paste `slack/manifest.yml`, and replace `your-server.example.com` with your URL.
3. **Install to Workspace**. Then copy these into `server/.env`:
   - **Basic Information › Signing Secret** → `SLACK_SIGNING_SECRET`
   - **OAuth & Permissions › Bot User OAuth Token** (`xoxb-…`) → `SLACK_BOT_TOKEN`
   - **OAuth & Permissions › User OAuth Token** (`xoxp-…`) → `SLACK_USER_TOKEN`
   - Your member ID (Slack profile › ⋯ › Copy member ID) → `SLACK_ALLOWED_USER_IDS`
4. Restart the server and type `/availability-tomorrow` in any DM.

Set `SLACK_ALLOWED_USER_IDS`. The calendar belongs to whoever set up the server, so without
this, anyone in the workspace could draft *your* availability.

### Microsoft Teams

Not built yet. Teams uses a *message extension* (a Bot Framework bot registered in Azure),
which can call the same `commands.py`. Only the adapter changes, the same way `slack.py` does it.

## Commands

| Command                  | Output                                   |
| ------------------------ | ---------------------------------------- |
| `/availability-tomorrow` | Your open windows tomorrow, in working hours |
| `/availability-today`    | Same, for today                          |

To add a command, add an entry to `COMMANDS` in `server/commands.py`. It's a function
that gathers facts and calls `llm.draft(...)`. It works right away in the iOS keyboard and via
`/draft <name>` in Slack. Add it to `slack/manifest.yml` if you want its own slash command.

## Setup

### 1. Google Calendar access

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and
   enable the **Google Calendar API**.
2. Set up the OAuth consent screen (External, and add yourself as a test user), then
   create an **OAuth client ID** of type **Desktop app**. Download the JSON.
3. On your computer:
   ```bash
   cd server
   pip install -r requirements.txt
   python get_google_token.py ~/Downloads/client_secret_XXXX.json
   ```
   Sign in. It prints `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REFRESH_TOKEN`.

### 2. Run the server

```bash
cd server
cp .env.example .env          # then fill it in
set -a; source .env; set +a
uvicorn app:app --host 0.0.0.0 --port 8000
```

Test it:

```bash
curl -s -X POST localhost:8000/expand \
  -H "Authorization: Bearer $EXPANDER_TOKEN" -H "Content-Type: application/json" \
  -d '{"command": "/availability-tomorrow"}'
```

Your phone needs to reach it over **HTTPS**. Any small host works (Fly.io, Render,
Railway, a VPS behind Caddy), or run it at home behind Tailscale or Cloudflare Tunnel.
Keep `EXPANDER_TOKEN` long and random, because anyone with it can read your free/busy times.

Settings (in `.env`): `USER_TIMEZONE`, `WORK_START_HOUR`, `WORK_END_HOUR`,
`MIN_SLOT_MINUTES`, and `GOOGLE_CALENDAR_IDS`, which is comma-separated so busy time
from several calendars counts.
The phone sends its own time zone with each request, so the output follows you when you travel.

Model: `claude-opus-5` with low effort by default, with server-side refusal fallbacks
turned on. For lower latency, set `CLAUDE_MODEL=claude-haiku-4-5`.

### 3. iPhone keyboard (optional, needs a Mac with Xcode)

1. In Xcode, create a new **iOS App** (e.g. "SlashExpander"). The container app can
   stay empty.
2. **File › New › Target › Custom Keyboard Extension**, named `SlashKeyboard`.
3. Replace the generated `KeyboardViewController.swift` with
   `ios/SlashKeyboard/KeyboardViewController.swift`, and add `ExpanderClient.swift`.
4. In the extension's `Info.plist`, set `RequestsOpenAccess` to `YES`
   (see `Info.plist.snippet.xml`).
5. Set `serverURL` and `token` in `ExpanderClient.swift`.
6. Run on your iPhone. Then go to **Settings › General › Keyboard › Keyboards › Add New
   Keyboard › SlashExpander**, tap it, and turn on **Allow Full Access**, which the
   network call needs.

The keyboard also has one-tap buttons for each command and an **Expand /command**
button if you'd rather not have it auto-expand when it opens.

### No-code alternative

See `shortcuts/README.md` for a Shortcut that copies the draft to your clipboard,
triggered by the Action button, Back Tap or Siri.

## Tests

```bash
cd server && python -m pytest -q
```
