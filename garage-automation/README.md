# Home Assistant + ratgdo Garage Automation

A complete, self-hosted garage automation stack:

1. **[Home Assistant](https://www.home-assistant.io/)** (open source) runs everything.
2. **[ratgdo](https://paulwieland.github.io/ratgdo/)** garage door opener controller running
   **[ESPHome firmware](https://github.com/ratgdo/esphome-ratgdo)** — the most extensible
   option: fully local, no cloud, and the device config is plain YAML you own.
3. **Automations** for:
   - **Arriving home** — opens the garage based on your phone's GPS location
     (Home Assistant Companion app) as you approach the house.
   - **Leaving home** — closes the garage based on the car's physical presence in
     the garage: it waits until the car *actually pulls out*, then closes behind it,
     with GPS "everyone left" as a backup.
   - Safety layer: obstruction-aware closing, close verification with critical
     alerts, "door left open" actionable notifications, and a nightly lockdown.

## Repository layout

```
garage-automation/
├── esphome/
│   ├── ratgdo-garage.yaml        # ratgdo32 disco firmware (recommended board)
│   ├── ratgdo-garage-v25i.yaml   # alternative: older ratgdo v2.5i board
│   ├── garage-car-presence.yaml  # optional ultrasonic car sensor (v2.5i only)
│   └── secrets.yaml.example      # copy to secrets.yaml and fill in
└── homeassistant/
    ├── configuration.yaml        # blocks to merge into your HA config
    └── packages/
        └── garage.yaml           # all helpers, automations, and scripts
```

## Hardware shopping list

| Item | Purpose |
|---|---|
| Raspberry Pi 4/5 (or any always-on box / VM / NAS) | Runs Home Assistant |
| **ratgdo32 disco** (recommended) | Garage controller **with built-in vehicle distance sensor** — powers the car-presence automations with zero extra hardware |
| *(alternative)* ratgdo v2.5i + ESP32 + HC-SR04/JSN-SR04T | Same features on the older board, using a DIY ceiling-mounted ultrasonic car sensor |
| Your phones | GPS presence via the free Home Assistant Companion app |

The ratgdo wires to your existing opener's wall-button terminals (dry contact) or
speaks the Security+ 1.0/2.0 serial protocol on Chamberlain/LiftMaster openers —
check your opener on the [ratgdo compatibility list](https://paulwieland.github.io/ratgdo/).

## Step 1 — Install Home Assistant

Follow https://www.home-assistant.io/installation/ (Home Assistant OS on a
Raspberry Pi is the easiest path). Create your account, set your home location
accurately during onboarding — the GPS automations depend on it.

Recommended add-ons (Settings → Add-ons):
- **ESPHome Device Builder** — build/flash/update the ratgdo firmware from the HA UI.
- **File editor** or **Studio Code Server** — edit the YAML in this repo.

## Step 2 — Flash the ratgdo with ESPHome firmware

You have two equivalent paths:

**Quick path:** use the official web installer at
https://ratgdo.github.io/esphome-ratgdo/ from Chrome/Edge with the board on USB,
then adopt the device in the ESPHome add-on. You now own its YAML.

**Repo path (what this repo assumes):**
1. Copy `esphome/secrets.yaml.example` to `secrets.yaml` in your ESPHome config
   directory and fill in Wi-Fi credentials, a generated API key
   (`openssl rand -base64 32`), and an OTA password.
2. Copy `esphome/ratgdo-garage.yaml` (disco) or `ratgdo-garage-v25i.yaml` into
   the ESPHome add-on's config directory.
3. First flash over USB; every update after that is over-the-air.

> **Security+ 1.0 or dry-contact opener?** The configs assume Security+ 2.0
> (yellow learn button). For other openers, swap the remote package per the
> [esphome-ratgdo README](https://github.com/ratgdo/esphome-ratgdo) (e.g. the
> `_secplusv1` or `_drycontact` base files).

4. Wire the ratgdo to the opener per the
   [official wiring guide](https://paulwieland.github.io/ratgdo/) for your model.
5. Home Assistant auto-discovers the device (Settings → Devices & Services →
   ESPHome). With the device named `garage-door` you get:
   - `cover.garage_door_door` — the door itself
   - `light.garage_door_light` — opener light
   - `binary_sensor.garage_door_obstruction` — safety beam
   - `binary_sensor.garage_door_motion` — wall-panel motion sensor
   - **disco only:** `binary_sensor.garage_door_vehicle_detected` / `_arriving` /
     `_leaving`, plus a laser parking-assist and pre-close warning beeper.

6. **Disco calibration:** park the car, then set the `Vehicle distance target`
   number entity to the measured distance (mm) so `Vehicle detected` reliably
   reflects the parked car. Set `Closing Delay` to a few seconds so the beeper
   warns before any automated close (a UL325-style safety courtesy).

## Step 3 — Phone GPS presence

1. Install the **Home Assistant Companion app** (iOS/Android) on each phone and
   connect it to your HA instance. Grant "always" location permission.
2. Each phone appears as a `device_tracker.*` entity. Assign each one to its
   owner's **Person** (Settings → People) so `person.alice` / `person.bob`
   reflect home/away.
3. Merge the blocks from `homeassistant/configuration.yaml` into your
   `configuration.yaml`, and add your coordinates to HA's `secrets.yaml`. This
   creates the **Home Approach** zone — a 250 m ring your phone crosses just
   before you reach the driveway, giving the door time to open.

## Step 4 — Install the automation package

1. Create `<config>/packages/` and copy in `homeassistant/packages/garage.yaml`.
2. Replace the placeholders at the top of the file:
   - `person.alice`, `person.bob` → your person entities
   - `mobile_app_alice_phone`, `mobile_app_bob_phone` → your phones' notify
     services (Developer Tools → Actions, search "mobile_app")
3. If you used the v2.5i + ultrasonic sensor instead of the disco, change the
   one `Car In Garage` template sensor to point at
   `binary_sensor.garage_car_presence_car_present` — every automation reads
   through that abstraction, so nothing else changes.
4. Check config (Developer Tools → YAML → Check configuration) and restart.

## What you get

| Automation | Trigger | Behavior |
|---|---|---|
| **Open on arrival** | Phone GPS enters *Home Approach* zone from away | Opens the door (only if closed), notifies everyone, verifies it opened; 15-min cooldown defeats GPS jitter |
| **Close after car leaves** | Disco sees the car back out (`vehicle_leaving`), or bay empty 3 min with the door open | 60 s grace, re-checks the car is gone + beam clear, closes, notifies |
| **Close when everyone leaves** | Last person's phone goes `not_home` for 2 min | Backup for bike/second-car departures — closes an open door |
| **Open-too-long alert** | Door open 20 min | Push notification with a **"Close it now"** button |
| **Notification action** | Tapping that button | Runs the safe-close script from anywhere |
| **Night lockdown** | 22:30 with door open | Closes and notifies |

All auto-open/auto-close behaviors have dashboard toggles
(`input_boolean.garage_*`) so you can disable them for guests or garage work
without touching YAML. Every automated close goes through
`script.garage_close_safely`, which refuses to close over a tripped obstruction
beam and fires a **critical** phone alert if the door doesn't confirm closed.

## Tuning knobs

| Knob | Where | Default |
|---|---|---|
| How early the door opens on arrival | `zone: radius` in configuration.yaml | 250 m |
| GPS-jitter cooldown | template condition in `garage_open_on_arrival` | 15 min |
| Grace period after the car pulls out | `delay` in `garage_close_after_car_leaves` | 60 s |
| Empty-bay fallback timer | second trigger's `for` in the same automation | 3 min |
| Open-too-long alert | trigger `for` in `garage_open_too_long_alert` | 20 min |
| Night lockdown time | time trigger in `garage_night_auto_close` | 22:30 |

## Security & safety notes

- **Everything is local** — ratgdo + ESPHome + HA need no cloud; the ESPHome API
  is encrypted with your key, and OTA updates are password-protected.
- Auto-opening a door based on GPS is a *convenience vs. security* trade-off:
  the zone-enter + came-from-away + cooldown conditions guard against spurious
  opens, but leave `garage_auto_open_on_arrival` off if that risk isn't
  acceptable to you.
- Automated closes only happen with a clear obstruction beam, and the disco's
  beeper/`Closing Delay` warns anyone nearby before the door moves. Keep your
  opener's photo-eye safety sensors functional — the automation trusts them.
