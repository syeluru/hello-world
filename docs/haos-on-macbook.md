# Running Home Assistant OS on a MacBook Air (Apple Silicon)

Full Home Assistant OS — Supervisor, add-ons, backups, everything — in a free
UTM virtual machine on macOS, with the Zigbee dongle passed through over USB.
No dedicated hardware beyond the ~$25 Zigbee coordinator.

Reference: [HA community guide — HAOS on Apple Silicon via UTM](https://community.home-assistant.io/t/guide-home-assistant-on-apple-silicon-mac-using-ha-os-aarch64-image/444785)

## Why this path (vs Docker on macOS)

- Docker Desktop on macOS **cannot pass USB devices** into containers → the
  Zigbee dongle would be unreachable. UTM (QEMU) does USB passthrough cleanly.
- HA Container mode has no Supervisor → no add-on store (ESPHome builder,
  Zigbee2MQTT, backup add-ons). The VM runs real HAOS, identical to an
  appliance install.

## Setup

### 1. Install UTM
Free download from https://mac.getutm.app (the $10 App Store version is the
same app; buying it just supports the developers).

### 2. Download the HAOS disk image
Grab the latest `haos_generic-aarch64-<version>.qcow2.xz` from
https://github.com/home-assistant/operating-system/releases and double-click
to decompress it to a `.qcow2` file.

### 3. Create the VM
In UTM: **Create New VM → Virtualize → Linux**
- Skip ISO boot; instead import the `.qcow2` as the drive
  (delete the default empty disk, **Import Drive** → pick the qcow2; use
  VirtIO interface).
- **CPU:** 2 cores  **RAM:** 4096 MB (leaves 12 GB for macOS)
- **Network: Bridged (Advanced → Bridged mode)** — critical. The VM gets its
  own IP on your LAN so `homeassistant.local`, phone apps, ESPHome discovery,
  and the ratgdo all reach it directly.
- Enable **USB sharing** in the VM's settings (QEMU USB 3.0 controller).

### 4. First boot
Start the VM, wait ~1–2 min, then open http://homeassistant.local:8123
from Safari and run onboarding. Set location, create your account.

### 5. Zigbee dongle passthrough
1. Plug the ZBDongle-E into the Mac **via a short USB extension cable**
   (reduces USB3 interference with the 2.4 GHz radio).
2. UTM prompts which OS gets the device → choose the VM. (Also visible under
   the USB icon in the VM window toolbar.)
3. In HA: Settings → Devices & Services → the Zigbee ZHA integration is
   auto-discovered → confirm. Pair sensors from there.

### 6. Keep the Mac awake 24/7
- Keep it on the charger, lid **open** (closing the lid sleeps a MacBook with
  no external display attached).
- System Settings → Battery → Options → enable **"Prevent automatic sleeping
  on power adapter when the display is off"**. Display sleep is fine; system
  sleep is not.
- Belt-and-suspenders (survives settings resets):
  `sudo pmset -c sleep 0 disksleep 0`
- Turn OFF automatic macOS updates ("install macOS updates" toggle) — an
  overnight auto-reboot takes the house down. Update manually, deliberately.

### 7. Start on boot
- System Settings → General → Login Items → add UTM.
- In UTM, set the VM to start automatically when UTM opens
  (Edit → check "Run on UTM start" / use `utm://start?name=<vm>` in a Login
  Item on older versions).
- Enable automatic login for your macOS user so a power-blip reboot comes all
  the way back up without a password prompt.

### 8. Backups (non-negotiable on this setup)
Settings → System → Backups → schedule daily full backups, and install the
**Google Drive Backup** add-on (or copy backups off the Mac). If the laptop
dies or you buy real hardware later, you restore the backup onto the new box
and every automation, dashboard, and Zigbee pairing comes back — migration is
a 20-minute job, not a rebuild.

## Known limitations & fixes

| Limitation | Impact | Fix |
|---|---|---|
| VM can't use the Mac's Bluetooth | No native BLE sensors | ESPHome Bluetooth proxy: any $5 ESP32 relays BLE to HA (better than local BT anyway — one per room) |
| Lid must stay open | Awkward placement | Park it like a picture frame; or `sudo pmset -a disablesleep 1` (never do this if the laptop ever goes in a bag) |
| USB passthrough drops if cable jiggled | Zigbee offline until re-attached | Optional upgrade: SLZB-06 Ethernet Zigbee coordinator (~$40) removes USB from the equation entirely |
| macOS updates / someone borrows the laptop | House goes dumb | House rule + manual updates; battery is at least a built-in UPS |

## The honest framing

This setup is genuinely fine for phase 1–2 (garage automation, mosquito-door
sensor, presence). The MacBook's battery even acts as a free UPS. Its real
cost is fragility-by-humans: lids get closed, laptops get borrowed. When the
house starts *depending* on automations, restore a backup onto a ~$150 N100
mini PC and repurpose the Mac as the wall dashboard.
