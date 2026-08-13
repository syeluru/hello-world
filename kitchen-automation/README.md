# Kitchen Inventory & Predictive Shopping

Goal: know instantly what's stocked, and have the shopping list build itself
*before* you run out.

## Read this first: why these systems fail

Almost every home inventory project dies the same death, and it's worth naming
before spending a dollar.

**Adding is easy. Consuming is hard.** Scanning groceries when they arrive is a
single natural moment — you're already unpacking. But the system only stays
accurate if it also knows the instant someone finishes the milk, uses the last
two eggs, or takes the backup ketchup. That event has no natural moment, no
natural trigger, and depends on every person in the house cooperating forever.
Miss a few and the database silently drifts from reality. Once you stop
trusting it, you stop using it — and the whole thing becomes a chore that
delivers nothing.

**Cameras don't rescue it.** The heavily marketed 2026 answer — a fridge camera
plus AI — genuinely works for well-lit, front-facing, packaged items on a
shelf. It does not see the yogurt behind the juice, anything in a drawer, how
much is left inside an opaque container, or the entire pantry and freezer.
Industry write-ups peg smart fridges at solving roughly a third of the problem,
and that matches what people report.

So the design below is built around a different principle:

> **Never require anyone to record what they used.**
> Predict consumption instead, and make correcting the prediction take one
> second.

## The architecture

```
INPUT                     TRUTH                    OUTPUT
─────                     ─────                    ──────
Barcode scan on restock ──┐
Voice "we're out of X"  ──┤
One-tap dashboard       ──┼──► Grocy ────────────► Auto shopping list
Weight sensors (bulk)   ──┤    (stock, min levels,   ├─► Phone / watch to-do
Fridge camera + AI      ──┘     consumption rates)   ├─► Kitchen display
                                                     ├─► "What can I cook?"
                                                     └─► Expiry warnings
```

**Grocy** is the source of truth — a self-hosted household inventory system
that runs as a Home Assistant add-on. It tracks products, stock levels,
minimum thresholds, expiry dates, and *consumption rates*, and it exposes
everything over an API. Barcodes resolve automatically against Open Food Facts.

The critical feature: **set a minimum stock level per product, and Grocy adds
it to the shopping list the moment stock drops below it** — which is exactly
the "preemptive" behavior you asked for.

## The three input paths that make it survivable

**1. Restock scan (the one deliberate habit).** When groceries land on the
counter, scan barcodes as you put them away. A dedicated USB/Bluetooth barcode
scanner mounted in the pantry makes this dramatically faster than a phone —
this single upgrade is the difference between a system that lasts and one that
doesn't. Delivery orders can be imported rather than scanned.

**2. Voice correction (the thing that saves it).** Anyone in the house can say
*"we're out of eggs"* to a kitchen speaker. That decrements stock to zero and
puts eggs on the list immediately. No app, no scanning, no walking anywhere.
This is what keeps the database honest without discipline — it turns the
correction into something faster than writing on a whiteboard.

**3. Prediction (the thing that means you don't have to).** Grocy learns that
milk gets bought every five days and flags it on day four whether or not
anyone told it anything. For staples with steady consumption — milk, eggs,
coffee, bread, paper towels — this alone is most of the value, and it requires
zero input after the initial setup.

## Where sensors genuinely help

Track **quantity by weight** for the things worth it, and let everything else
run on prediction:

| Item | Sensor | Why it works |
|---|---|---|
| Rice, flour, sugar, pet food, coffee beans | Load cells under the bin (~$15) | Opaque containers, steady use, genuinely useful to know remaining |
| Beer keg / bulk liquids | Scale platform | Continuous readout, no guessing |
| Fridge contents overview | Camera inside + AI vision on door-close | Answers "do we have X right now" from your phone |
| Freezer inventory | Photo + labels via a vision model | The single hardest place to remember contents |
| Pantry shelf | Camera + periodic AI snapshot | Coarse but useful for staples |

The fridge/freezer camera layer is worth building **for lookup, not for
counting**. Its job is answering "is there still parmesan?" while you're at the
store — not maintaining the database.

## The intelligence layer

Once Grocy holds real data, a language model on top gives you:

- **"What can I make right now?"** — answered from actual stock, prioritizing
  what's closest to expiring, respecting whatever anyone's avoiding this month.
- **A weekly shopping list that's already written** — below-minimum items, plus
  predicted runouts before the next shop, grouped by store aisle.
- **Expiry triage** — "three things expire this week, here are two recipes that
  use all of them."
- **Spend and waste reporting** — what you throw away repeatedly is a buying
  signal, and Grocy tracks it.

## Build order

**Phase 1 — today, zero new hardware.** Home Assistant's built-in to-do list
plus voice capture. Anyone can say "we're out of eggs" or add items from their
phone; a weekly automation nudges the list before shopping day. This alone
solves half the problem and costs nothing. Starter config in
`homeassistant/packages/kitchen_inventory.yaml`.

**Phase 2 — the real system.** Install the Grocy add-on, seed the 30–50
products you actually run out of (do NOT try to inventory every spice), set
minimum stock levels, and connect it to Home Assistant so the shopping list
syncs to everyone's phone. Add a barcode scanner in the pantry.

**Phase 3 — automation and sensing.** Load cells under bulk bins. A camera in
the fridge with AI-generated contents summaries. NFC tags on cabinet doors for
one-tap consume. A kitchen wall display showing live stock and the list.

**Phase 4 — intelligence.** Recipe suggestions from real stock, expiry-driven
meal planning, weekly briefings, and ordering integration.

## Hardware shopping list (money-no-object version)

| Item | Rough cost | Notes |
|---|---|---|
| Bluetooth/USB barcode scanner | $30–70 | Mount in the pantry. The highest-impact purchase here. |
| Kitchen wall tablet | $150–400 | Live stock, list, recipes. Dark theme, big touch targets. |
| Voice satellite in the kitchen | $60 | The "we're out of X" capture point. Local processing. |
| Load cell kits (×4–6) | $15 each | Bulk bins, pet food, coffee. |
| Fridge/pantry cameras | $40–100 each | Wide-angle, for AI lookup rather than counting. |
| NFC tags | $10 for 10 | Inside cabinet doors, one-tap "out of this." |

## The honest expectation

A well-run version of this will be **roughly 85–90% accurate**, and that's the
realistic ceiling — not because the software is bad, but because households are
chaotic. Design for that: use it to *build the shopping list* and to *answer
questions from the store*, not as an authoritative ledger. The moment you need
it to be perfect, it becomes a chore and dies.

Optimize for one thing above all: **never letting anyone be the data entry
clerk.**
