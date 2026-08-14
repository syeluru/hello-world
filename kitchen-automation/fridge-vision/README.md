# Fridge Vision — camera-based contents detection

## The insight that makes this work

The obvious design is: put cameras inside, photograph the shelves, ask a vision
model what's there. Everyone tries this. It plateaus at roughly a third of the
problem, and the reason is **occlusion** — the yogurt behind the juice, the
thing in the drawer, the half-used jar at the back. No number of cameras fixes
it, because food is stored in dense opaque piles. Adding cameras adds angles,
not x-ray vision.

Flip the problem:

> **Don't photograph the shelves. Photograph the doorway.**

Every item that enters or leaves the fridge crosses one plane — the door
opening — individually, held in a hand, front-facing, at close range, under
consistent light. Those are *ideal* conditions for a vision model, and it is
the only moment an item is guaranteed to be unoccluded.

So the system maintains a **ledger of what went in and out**, rather than
trying to see the current state. Shelf cameras still exist, but they're
demoted to a secondary job: periodic ground-truth snapshots to correct drift
in the ledger, and answering "show me the fridge right now" from your phone.

```
     ┌──────────── the door plane ────────────┐
     │  every item crosses here, exactly once, │
     │  unoccluded, in a hand, well lit        │
     └─────────────────────────────────────────┘
                        │
      ┌─────────────────┴──────────────────┐
      ▼                                    ▼
 DOORWAY CAMERAS                     SHELF CAMERAS
 "what changed"                      "what it looks like now"
 → +2 eggs, -1 milk                  → drift correction
 → the ledger                        → visual lookup from the store
      │                                    │
      └──────────────┬─────────────────────┘
                     ▼
            SHELF LOAD CELLS
       "something 340 g left shelf 2"
       → confirms an event happened, and how much
```

Three independent signals, each covering the others' blind spots. Weight
catches events vision missed. Vision names what weight only measured. Shelf
snapshots catch drift both missed.

## The physics that kills naive builds

A fridge is a genuinely hostile place for electronics. Budget for these:

**Condensation is the number one killer.** When the door opens, warm humid room
air hits a cold lens and fogs it instantly. Your photo is a white blur exactly
when you need it. Mitigations, in order of effectiveness:
- Mount doorway cameras **outside the cold zone**, on the door frame or the
  cabinet above, looking *into* the opening. The lens stays at room temperature
  and never fogs. This is the single best decision in the whole build.
- For cameras that must live inside: sealed IP67 enclosure with a desiccant
  pack, conformal coating on the board, and a small resistor or lens heater.
- Capture timing helps too — grab the frame in the first ~200 ms of the door
  opening, before fog forms.

**Batteries are not viable.** Lithium cells lose most of their usable capacity
at 4 °C, and a camera is not a low-power load. Community projects report a
400 mAh cell lasting three weeks for a *door sensor* — a camera would last
hours. Run power in: a thin ribbon or flat USB-C cable through the door gasket
survives the seal fine (this is standard practice in RV and fermentation-fridge
builds), or tap the interior light circuit.

**Lighting is only on when the door is open.** That's convenient for doorway
cameras (capture only happens then anyway) but means shelf cameras need their
own LED ring, ideally a warm, high-CRI one so the model sees accurate colors.

**Nothing should run continuously.** Capture is event-driven off a door sensor.
Continuous video in a fridge is wasted power, wasted bandwidth, and a privacy
liability for no gain.

## Hardware

| Role | Part | Cost | Notes |
|---|---|---|---|
| Doorway camera ×2 | Seeed XIAO ESP32-S3 Sense | $15–25 ea | Tiny, camera onboard, ESPHome-native. Mount on the frame, room-side, angled into the opening. Two gives you both hands and depth. |
| Shelf cameras ×2–3 | XIAO ESP32-S3 Sense in IP67 enclosure | $25–40 ea | Top corners, wide angle, pointing down and across. Sealed, with desiccant. |
| Lens heater | 5 Ω resistor + MOSFET | $3 | Pulses for 10 s before an interior capture. Kills fog. |
| Interior lighting | Warm high-CRI LED strip | $15 | Only for shelf captures. Color accuracy matters to the model. |
| Door sensor | Reed switch, wired to a camera's GPIO | $2 | The master trigger. Wired beats Zigbee here — zero latency. |
| Shelf load cells | 4× load cell + HX711 per shelf | $15/shelf | Weight deltas. The highest-signal, lowest-cost sensor in the build. |
| Power | Flat USB-C through the gasket | $10 | One cable, split inside. |

Total for a well-instrumented fridge: **roughly $150–250**.

The premium alternative is a commercial fridge with this built in (Samsung and
GE both ship AI-vision fridges now), but they're cloud-locked, they only see
the main compartment, and you can't point them at your pantry or a second
fridge. The DIY version is cheaper, local, and generalizes.

## The software pipeline

1. **Door opens** → doorway cameras start capturing a burst
2. **Door closes** → burst is bundled and sent to a multimodal model with a
   structured-output schema: `{item, direction: in|out, quantity, confidence}`
3. **Ledger updates** — stock incremented or decremented in Grocy
4. **Weight deltas reconcile** — if shelf 2 lost 340 g but vision saw nothing,
   flag an unknown removal rather than silently drifting
5. **Nightly** — a shelf snapshot goes to the model for a full contents list,
   which corrects accumulated ledger error
6. **On demand** — "what's in the fridge?" returns the latest shelf snapshot
   plus the model's description, answerable from the grocery store

Home Assistant already has the pieces: `ai_task.generate_data` accepts an image
and returns **structured JSON against a schema you define**, which is exactly
what turns a photo into entities. The `llmvision` custom integration does
similar work with more camera-specific plumbing. Either works; AI Task is
built in.

## What to expect, honestly

- **Doorway detection: genuinely good.** Single items, unoccluded, in-hand —
  this is the easy case for modern vision models. Expect high accuracy on
  packaged goods, decent on loose produce, poor on anything in an opaque bag.
- **Shelf snapshots: useful, not authoritative.** Great for "do we still have
  parmesan" from the store. Bad at counting.
- **Weight: perfectly reliable, semantically blind.** It always knows *something*
  changed and by how much, never *what*.
- **Combined: 90%+ on the items you actually care about**, which is the goal.

The failure mode to design around isn't inaccuracy — it's **silent** inaccuracy.
Every layer above should surface its own uncertainty ("something left shelf 2
and I don't know what") so the system asks rather than drifts.

## Build order

1. **Door sensor + one doorway camera + AI Task pipeline.** Prove the flux idea
   works before instrumenting anything else. One camera, one prompt, log results
   to a notification and eyeball them for a week.
2. **Second doorway camera + Grocy ledger integration.**
3. **Shelf load cells.** Cheap, and they immediately catch what vision misses.
4. **Interior shelf cameras + nightly reconciliation.**
5. **Voice and dashboard layer** — "what's in the fridge", expiry warnings,
   recipe suggestions from real contents.

Starter configs: `esphome/fridge-camera.yaml` and
`../homeassistant/packages/fridge_vision.yaml`.
