# Garage buttons on iPhone (when Companion widgets are broken)

## The problem

Home Assistant's iOS Companion app has an open bug where home-screen widgets
are created and configured normally, but tapping a script or scene does nothing
— no action, no haptic feedback. Tracked as
[home-assistant/iOS#4488](https://github.com/home-assistant/iOS/issues/4488)
(reported April 2026, unfixed at time of writing). Affects iOS 26.4 with
Companion builds around 2026.1873, on both legacy and custom widgets.

The script itself is fine — it runs correctly from inside the app. Only the
widget path is broken.

## Route 1 — HomeKit Bridge (recommended)

Exposes Home Assistant entities to Apple Home. Best option for a household:
no per-person setup, no tokens, and it survives Companion app bugs entirely.

**In Home Assistant:**
1. Settings → Devices & Services → **Add Integration** → search **HomeKit Bridge**
2. When asked which domains to include, select **cover** (and **script** if you
   also want the two buttons as separate switches)
3. On the next screen, include `cover.garage_door_door`
4. Submit. A notification appears in Home Assistant with a **pairing QR code** —
   find it under Settings → Notifications if you miss it

**On each iPhone:**
1. Open **Home** (Apple's app) → **+** → **Add Accessory**
2. Scan the QR code from Home Assistant
3. Accept the "uncertified accessory" warning — that's expected for a bridge
4. Assign it to a room

**What you get, on every family iPhone:**
- Apple's native garage-door tile with a proper open/close control
- Control Center and Lock Screen buttons
- "Hey Siri, open the garage" — including from CarPlay and Apple Watch
- The native Home widget on the home screen
- Anyone in your Apple Home household gets it automatically — no HA account
  needed for each person

Note: this works on the local network. Remote access away from home needs
either a HomePod/Apple TV acting as a Home Hub (Apple's own remote access) or
Nabu Casa for the Home Assistant side.

## Route 2 — Shortcuts calling the API directly

Bulletproof fallback that bypasses the Companion app completely. Produces a
home-screen icon that looks and behaves like an app.

1. Open the **Shortcuts** app → **+**
2. Add action **Get Contents of URL**
3. Configure:
   - **URL:** `http://homeassistant.local/api/services/script/turn_on`
   - **Method:** POST
   - **Headers:**
     - `Authorization` → `Bearer YOUR_LONG_LIVED_TOKEN`
     - `Content-Type` → `application/json`
   - **Request Body:** JSON, one field:
     - `entity_id` (Text) → `script.garage_open_now`
4. Name it "Open Garage", pick an icon
5. Share sheet → **Add to Home Screen**
6. Duplicate the whole shortcut, swap the entity to `script.garage_close_now`,
   name it "Close Garage"

Also gives you Siri for free — the shortcut name becomes the phrase.

Trade-off: the token lives inside the shortcut. Fine on a personal device, and
revocable at any time from Home Assistant's Security page. Prefer Route 1 for
other people's phones.

## Route 3 — wait for the fix

The bug is in the app, so it will be fixed in a Companion release. Keep the
widgets configured; they will start working again on their own. Just don't rely
on them until they do.
