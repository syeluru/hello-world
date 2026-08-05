# The Smart Home: Art of the Possible (2025–2026)

A full-spectrum survey of what can be done in a home today — sensors, automations,
whole-home orchestration, AI, infrastructure, and the money-no-object tier — compiled
from six parallel research sweeps across Reddit (r/homeassistant, r/homeautomation,
r/smarthome, r/esphome, r/LocalLLaMA), the Home Assistant community forums, Hacker News,
YouTube (Everything Smart Home, The Hook Up, Smart Home Solver, Smart Home Junkie,
NetworkChuck), SmartHomeScene, Level1Techs, CEDIA/custom-install industry press, and
dozens of project blogs and GitHub repos.

---

## 1. The Mental Model

Everything below fits a five-layer stack. The magic is never in one device — it's in
combinations across layers:

```
5. INTELLIGENCE   LLMs, computer vision, prediction, optimizers (Predbat/EMHASS)
4. ORCHESTRATION  house modes, presence fusion, scenes, notification etiquette
3. AUTOMATION     the recipes: triggers → conditions → actions
2. ACTUATION      lights, locks, valves, motors, HVAC, relays, robots
1. SENSING        presence, environment, energy, water, sound, weight, vision
0. SUBSTRATE      Home Assistant + ESPHome + MQTT + Zigbee/Thread/Matter, local-first
```

Community doctrine, repeated everywhere:
- **Local-first wins.** Cloud dependencies are how automations die (myQ, SkyDrop,
  Rachio→Rain Bird are the cautionary tales). ESPHome/Zigbee/Z-Wave preferred.
- **ESPHome is the universal glue.** Nearly any "dumb" or unsupported device becomes a
  first-class citizen for $10–30 of parts.
- **Power draw is a universal state sensor.** A $12 metering plug makes any appliance smart.
- **The spouse test:** the best automations are invisible until they break; every device
  must still work "the old way."
- **Automate what people forget, not what takes one second.**

---

## 2. The Sensor Universe (what can be sensed)

### Presence & occupancy — the crown jewels
| Tech | What it does | Notes |
|---|---|---|
| PIR motion | Moving heat, instant | $10–20 (Aqara, Sonoff); fails on still people |
| **mmWave radar** | True static presence — detects breathing | The category-defining upgrade. Aqara FP2 (~$70, 30 zones, multi-person, fall detection), FP300 (battery+Thread), Everything Presence One/Lite, Apollo MSR-2; DIY LD2410 (~$5) / LD2450 (multi-target X/Y) |
| PIR + mmWave hybrid | PIR for instant-on, radar for hold | The consensus endgame |
| BLE room tracking | *Who* is in which room | Bermuda + ESP32 proxies (~$5/room), ESPresense; phones/watches as beacons |
| UWB | ~10 cm indoor positioning | Makerfabs MaUWB nodes; still hobbyist frontier |
| Camera CV | Person/car/pet/package as sensors | Frigate NVR — free local face + license plate recognition since v0.16 |
| Bed/seat | Load cells + HX711 (~$15), FSR strips, pressure mats, Withings Sleep mat | The keystone "actually asleep" signal |
| Wi-Fi CSI | Presence from Wi-Fi distortions — no sensor at all | Bleeding edge (esp-csi); "your router is a motion sensor" is arriving |

### Environmental
Temp/humidity ($4 hacked Xiaomi LYWSD03MMC is the community champion — people run 20+),
true-NDIR CO2 (SCD40/Aranet4/AirGradient; beware fake "eCO2"), PM2.5/VOC/NOx (SEN55,
IKEA Vindstyrka), radon (Airthings, RadonEye), formaldehyde (SFA30), even DIY Geiger
counters. Barometric pressure party trick: detect a door opening anywhere in a tight
house from the pressure blip.

### Water
Leak pucks ($15–20 — the best-ROI sensor in the hobby) + motorized main shutoff;
whole-home flow monitors (Moen Flo, Phyn, Flume); AI-on-the-edge ESP32-CAM reads your
analog utility meter with OCR; a $5 magnetometer taped to the meter reads the spinning
magnet; soil moisture (Ecowitt WH51, MiFlora, Apollo PLT-1); pool pH/ORP probes
(Atlas Scientific).

### Energy
Per-circuit CT monitoring (Emporia Vue — flashable to ESPHome for full local),
disaggregation (Sense), metering smart plugs as appliance-state detectors, IR pulse
readers on utility meters, rtl-sdr receiving the meter's own radio broadcasts for free.

### Sound, vibration, weight
Acoustic event classifiers (baby cry, glass break, smoke-alarm pattern, dog bark —
Seeed module or DIY ESP32+I2S mic); vibration sensors for dryers, garage doors, knocks,
sump pipes; load cells under anything: beds, kegs (pints remaining), cat litter boxes
(visit tracking + weight-trend illness early warning), propane tanks, beehives.

### The long tail (all actually built)
Toilet-flush detection, sump pit level + pump-health monitoring, chest-freezer alarms,
3D-printer enclosure air quality, chicken coop doors, beehive scales with swarm alerts,
aquarium/reef controllers, BBQ probes, mailbox lids, driveway magnetometer probes,
break-beam direction counters, Christmas tree water level, water softener salt level,
lightning detectors (AS3935, strikes to 25 mi).

---

## 3. The Automation Cookbook

### The consensus "top 10" (appears in virtually every thread)
1. **Presence lighting** with time-of-day brightness and mmWave hold — "single most impactful"
2. **Laundry done** via power monitoring, with escalating "unload me" nags until the door sensor opens
3. **Leak → automatic water main shutoff** — "pays for itself the first time"
4. **Goodnight/Goodbye one-button routines** (lock, arm, lights, climate, media)
5. **Phone-alarm-linked sunrise wake** + coffee (sbyx blueprint — change your phone alarm, the house follows)
6. **Everyone-left security check** with actionable "Lock it" notification
7. **Adaptive/circadian lighting** (Adaptive Lighting integration)
8. **Window open → HVAC pause** for that zone
9. **Fridge/freezer/garage door-left-open** escalating alerts
10. **Trash-day + low-battery digest** housekeeping (dead sensors are how automations silently die)

### Gems worth stealing
- **Dad Mode**: partner's phone leaves during the 5–7pm window while you're home solo → kids' channel on TV, pink lights, kids' playlist.
- **WWE entrance themes** per family member on arrival — the party trick people actually keep.
- **Self-healing lights**: entity unavailable 5 min → smart plug power-cycles it and re-syncs the room.
- **Blame-the-ISP bedtime**: scheduled Wi-Fi cutoff for kids' tablets.
- **Chore-for-candy pipeline**: Zigbee button → chore dashboard on the Nest Hub → parent taps "approve" → a pet feeder dispenses candy.
- **Sunset-minus-4-minutes**: shades open so you never miss the sunset.
- **Toothbrush enforcement**: no brushing session logged by bedtime → speakers remind the kid.
- **"Open the windows now"** advisor: inside > outside temp → text; replaced owning an AC unit.
- **Stove-left-on**: power >100 W for 30 min + no kitchen motion 15 min → alert (used for elderly parents).
- **Vacation presence simulation** by replaying your own historical light patterns — not random timers.
- **On-air light** for WFH calls — including a network-sniffing variant that detects VoIP traffic so nothing runs on the locked-down work laptop.
- **iPhone battery babysitter**: charge stops at 79%, resumes at 70% — 91% battery health after two years.
- **Kettle "signs of life" elder care**: no kettle use by 10am → alert family. Passive anomaly detection on existing routines beats wearables.

### Notification doctrine (the meta-skill)
Actionable buttons on every nag; escalation ladders (phone → spouse → TTS → siren);
snooze buttons to prevent alert fatigue; ambient light-color channels instead of pings
(hall light orange = garage open); TTS etiquette — chime first, duck media, respect DND,
never announce to guests; critical alerts (water, "garage did not close") bypass silent mode.

---

## 4. Orchestration — the layer that separates gadgets from a system

- **House modes as a small state machine**: an `input_select` for the time/occupancy axis
  (Morning/Home/Evening/Night/Away/Vacation) plus *orthogonal booleans* (guest, DND,
  manual-override, party). Few writers, many readers: automations are mode-gated
  reactions. The most architecturally interesting variant runs three independent layers:
  house clock, alarm level, and per-room state (Vacant/Occupied/Engaged).
- **Presence fusion**: GPS + router Wi-Fi + BLE room-level + mmWave + door contacts,
  fused with Bayesian sensors (documented result: false departures cut from 5–10/week
  to ~0–1). Wasp-in-a-box logic for windowless rooms. Guest-mode boolean so the
  babysitter never gets locked in the dark.
- **Design artifact worth copying**: a matrix spreadsheet — entities as rows, situations
  (home/armed/away/vacation/alarm-triggered) as columns, desired behavior per cell.
- **Anti-patterns people ripped out**: voice-controlled lights (novelty dies), welcome-home
  announcements (annoying), location-approach announcements, over-templated YAML,
  entity-ID (vs area) bindings, and any automation with no physical fallback.
- **The bar for reliability**: one user's HA was down six months and the only complaint
  was outdoor lights not following the sun — everything else had physical switches.

---

## 5. The AI Frontier (2025–2026)

- **Voice, fully local**: HA Voice Preview Edition ($59), ESP32-S3 satellites with
  on-device wake words, Speech-to-Phrase (<1s on a Pi), streaming TTS (13× faster
  perceived latency), room-aware commands ("turn off the lights" = this room's lights),
  bilingual dual-wake-word households. Alexa/Google fully replaceable today if you name
  entities carefully; GPU makes it conversational.
- **LLMs as the home's brain**: native OpenAI/Anthropic/Ollama conversation agents with
  local-command fallback; **AI Task** turns any multimodal LLM into a virtual sensor
  factory (point it at the coop cam: "how many chickens?" → number sensor);
  LLM-suggested and LLM-written automations; **MCP server** — Claude can audit energy
  use, debug automations, and write new ones conversationally with 87+ tools.
- **Vision**: Frigate v0.16+ does person/car/animal/package, face recognition, and
  license plate recognition — free and local. Semantic search ("person carrying a box
  at night"), GenAI event narration ("a mail carrier left a package at 2:14pm"),
  AI review summaries classifying alerts normal/suspicious/dangerous.
- **The joyful frontier**: BirdNET-Go identifies birds acoustically *from your existing
  security cameras' microphones*; "most interesting bird today" ranked on an e-paper
  dashboard; WhoIsAtMyFeeder for visual feeder ID.
- **Predictive**: Bayesian presence, learned area-occupancy priors, flow-based leak
  inference, LLM-as-anomaly-detector ("what looks off in this week's energy data?").
- **Robots**: Valetudo de-clouds vacuum fleets with room-aware voice dispatch ("clean
  under the dining table"); lawn robots with RTK GPS gated by rain forecast and
  Frigate kids-in-yard detection; 1X NEO humanoids started shipping to homes in 2026 —
  no HA integration story yet; pure frontier.

---

## 6. Infrastructure, Energy & Outdoors

- **Energy arbitrage is a solved game**: Predbat/EMHASS optimizers plan 48h ahead
  against dynamic tariffs + solar forecasts (Solcast). UK Octopus Agile users report
  ~£1,300/yr from battery arbitrage alone. Solar-excess diversion priority chains:
  water heater ("hot water as a battery") → EV → pool pump. OCPP makes any EV charger
  locally controllable; evcc handles charge-on-sunshine in 1A steps as clouds pass.
- **Resilience stack**: UPS + NUT graceful shutdown → whole-home battery with
  circuit-level load shedding (Span/Emporia) → generator auto-start → Starlink failover.
  Automations that fail safe: valves close, exits unlock, generator starts.
- **Water defense**: whole-home monitors do nightly micro-leak pressure tests; insurers
  give 3–10% discounts (some hand out free hardware — Ting electrical-fire monitoring).
- **Irrigation done right**: evapotranspiration math (FAO-56) from your own weather
  station computes per-zone watering; OpenSprinkler for local-forever control.
- **Climate envelope**: $10 ESP32 on a Mitsubishi minisplit's CN105 port replaces the
  cloud app; TRVs + Better Thermostat per room; ERV boost on CO2; gutter heat cable
  only when temp 15–35°F *and* precipitation present; smoke → HVAC off, lights 100%,
  doors unlock.
- **Outdoors**: RTK robot mowers, Ecowitt local weather driving everything, WLED pixel
  trim lighting at $2–4/ft DIY, magnetometer driveway probes, LoRa mailbox sensors for
  long driveways, greenhouse/coop/pond/beehive full automation.

---

## 7. The Money-No-Object Tier

Industry rule: technology = 4–8% of home value on a new build ($1M–$4M+ on an estate).

- **Control**: Crestron/Savant + Lutron HomeWorks backbone + Josh.ai local voice;
  KNX/Loxone wired bus in Europe. The modern enthusiast bridge: **pro backbone
  (Lutron/KNX reliability), Home Assistant brain (3,000 integrations, AI, free logic).**
- **Lighting**: Lutron Ketra full-spectrum circadian fixtures tracking solar position
  ($80K–$200K+ whole-home); DMX starfield ceilings; permanent addressable eave lighting.
- **Motorized everything**: 40–100 shade openings ($1.5–5K each), art that slides off
  TVs, pivoting walls, wind-aware awnings, snow-melted driveways ($12–28/sq ft).
- **AV**: AV-over-IP everywhere, invisible plastered-over speakers, Trinnov 36-channel
  theaters ($250K–$1M+), Kaleidescape movie servers, C SEED MicroLED TVs that rise from
  underground vaults ($233K–$593K).
- **Security**: perimeter radar + LiDAR virtual fencing (classifies humans vs animals),
  LPR gates, UWB walk-up-and-unlock locks (Aliro standard), safe rooms ($30K–$75K).
- **Wellness**: sauna/steam/cold-plunge contrast-therapy scripting, room-by-room IAQ
  remediation, circadian everything.
- **The absurd**: WineCab robotic wine wall with 8-axis arm and facial-recognition
  access ($139K–$250K); glass panoramic home elevators ($70K–$100K+).

---

## 8. Original Combination Blueprints (synthesis)

Cross-layer combos assembled from the parts above — each is buildable today:

1. **The Immune System**: flow meter + leak pucks + CT clamps + Ting + sump monitor +
   freeze sensors feeding one "house health" score; anomalies auto-mitigate (valve,
   load-shed, heat-trace) and an LLM writes the weekly "what looks off" report.
2. **The Butler Protocol**: presence fusion + calendar + commute + weather → the house
   stages your morning (wake ramp keyed to your *first meeting*, coffee, car
   preconditioned, TTS briefing written by a local LLM with personality) — and stages
   down behind you room by room as BLE tracking watches you leave.
3. **The Guardian**: for aging parents — kettle/water-flow/med-drawer routine anomaly
   detection + radar fall sensors in bathrooms (no cameras) + stove-power interlocks +
   escalation to family. Passive, dignified, no wearables.
4. **The Circadian Envelope**: sun-position lighting + auto shades + CO2-driven fresh
   air + bedroom temp ramps + bed-presence gating — the house optimizes your sleep
   pressure all day without a single command.
5. **The Energy Trader**: Predbat + dynamic tariff + solar forecast + EV + hot-water
   battery + load shedding, with an LLM monthly P&L report. The house pays rent.
6. **The Naturalist**: BirdNET-Go on camera audio + Frigate wildlife detection + weather
   station + e-paper "field notes" display — the house as an ambient nature journal.
7. **The Stage Manager**: mmWave zones + media state + per-room modes → movie mode that
   pauses when someone stands up, dinner mode when the kitchen sees sustained evening
   presence, focus mode when your desk zone is occupied and your calendar says deep work.
8. **The Night Watch**: both beds occupied → perimeter arms, water heater sleeps,
   Wi-Fi CSI watches for anomalies, any 1–5am door opening lights the path for family
   but challenges strangers via a Frigate face check + LLM-composed spoken warning.

---

## 9. The Maturity Ladder (how people actually climb)

1. **Foundation**: HA + Zigbee dongle + metering plugs + leak sensors + contact sensors.
2. **Presence**: mmWave per room, phone GPS, one automation per room that "just works."
3. **Orchestration**: house modes, bed sensors, notification etiquette, guest mode.
4. **Infrastructure**: energy monitoring, water shutoff, HVAC integration, UPS.
5. **Intelligence**: Frigate, local voice, LLM narration, optimizers.
6. **Exotica**: whatever your imagination and load cells can construct.

Full source lists live in the six research digests this document distills; standout
hubs: SmartHomeScene's presence-sensor guide, the HA community "What is your most
useful automation" and "What are your House Modes?" mega-threads, Level1Techs'
automation-sharing thread, The Hook Up's irrigation/LED test videos, Frigate docs,
Predbat/EMHASS docs, and the esphome-ratgdo ecosystem.
