# Getting the shopping list right without tracking inventory

## The reframe

Inventory tracking is a means, not the goal. The actual needs are:

1. An always-current shopping list that everyone can add to
2. Knowing when to reorder before running out

Neither requires knowing what is in the fridge. Both can be solved by attacking
the *purchase cycle* instead of the *stock level* — and the purchase cycle is
already fully observable with no new hardware.

Ranked by payoff per unit of effort:

---

## 1. Cadence beats inventory (highest payoff, zero sensors)

You buy milk roughly every six days. That fact predicts your next milk purchase
more reliably than any camera, because it is a property of your household's
consumption, not of a shelf's contents at one moment.

Implement it as **recurring calendar events**. Home Assistant's Local Calendar
supports native recurrence, so "Milk, every 6 days" is one event with a
repeat rule, editable from the UI by anyone, with no YAML per item. When the
event fires, the item lands on the shopping list.

Why a calendar rather than helpers or a database:
- Recurrence rules are built in and handle every cadence you'd want
- Adding a staple takes fifteen seconds in a UI anyone can use
- Adjusting cadence is dragging a date — the system tunes itself by hand as
  you notice things arriving too early or too late
- No sensors, no scanning, no maintenance

Seed it with the twenty or thirty things you genuinely run out of. Ignore
everything else — spices and condiments don't need a system.

**Config: `packages/kitchen_staples.yaml`**

---

## 2. Eliminate whole categories with recurring delivery

For non-perishables with steady use — paper towels, dish soap, detergent,
coffee, pet food, toothpaste — don't track them at all. Put them on Subscribe
& Save or a recurring grocery order and delete them from your mental model
entirely. You are not solving an information problem for these items; you are
solving a purchasing problem, and the purchasing problem has a purchasing
solution.

This removes maybe a third of the list permanently, for zero effort.

---

## 3. Capture "we're out" at the moment it happens

The instant someone finishes something is the only reliable signal, and it
lasts about three seconds. Make capturing it faster than not capturing it:

- **Voice** — "we're out of eggs" to any speaker. Already built.
- **Physical buttons on the shelf** — a $10 Zigbee button stuck next to the
  coffee, the dog food, the paper towels. Press it, it's on the list. No phone,
  no app, no talking. Absurdly effective for the five or six things you reorder
  most, and the tactile version is the one guests and kids will actually use.
- **A barcode scanner by the trash.** This is the sleeper idea: the bin is
  where "we're out" is physically expressed. Scan the empty carton as you throw
  it away and the item is on the list — the natural moment already exists, you
  just instrument it. Roughly $40, and unlike restock scanning it captures the
  event that actually matters.

---

## 4. Mine the data you already generate

Every grocery order confirmation lands in your email. That is a complete
purchase ledger, already timestamped, requiring no behavior change at all.

- Parse order confirmations to learn real cadence per item, which makes the
  calendar in step 1 self-tuning rather than guessed.
- Receipt photos work the same way for in-store trips — snap it, let a model
  extract the line items. The community `Home Organizer (HO-AI)` integration
  does exactly this.

This is the closest thing to free inventory intelligence that exists, because
the data is already being produced whether or not you use it.

---

## 5. One photo a week beats five cameras

Before shopping, open the fridge and pantry and take two photos. Send them to a
vision model and ask what looks low. Ten seconds of effort, no hardware, no
condensation, no power runs — and it captures most of what permanently mounted
shelf cameras would tell you, at the only moment the answer matters.

If it ever becomes a habit worth automating, *then* mount a camera. Not before.

---

## 6. Fix the delivery problem, not the data problem

Often the list is fine and the failure is that it wasn't in front of you at the
store. Cheap fixes:

- **Push the list when someone arrives at the store.** Geofence the two or
  three places you actually shop; entering one sends the current list as a
  notification. Config included.
- **Shared list, genuinely shared** — on every phone, on a kitchen display,
  addable by voice. Most "we forgot to buy it" failures are capture failures by
  someone who wasn't holding the list.
- **Notify the shopper when someone adds an item mid-trip.**

---

## 7. Invert it: let meal planning generate the list

Pick the week's meals, and the ingredients become the list. You no longer need
to know what you have — you need to know what you're cooking. Grocy and most
meal-planning tools do this natively, and it converts a continuous tracking
problem into one fifteen-minute decision per week.

---

## What this stack actually costs

| Layer | Effort | Cost |
|---|---|---|
| Recurring staples calendar | 30 min setup | $0 |
| Subscribe & Save for consumables | 20 min once | $0 |
| Voice capture | done | $0 |
| Shelf buttons ×6 | 30 min | ~$60 |
| Store geofence push | 10 min | $0 |
| Trash-side barcode scanner | 1 hour | ~$40 |
| Weekly photo habit | none | $0 |

**Under $100 and an afternoon**, versus a few hundred dollars, a wiring
project, and an ongoing accuracy problem — for the same outcome, which was
never "know the fridge contents" but "never run out and never forget."

Revisit cameras only if this stack is running well and something specific is
still failing. Build the cheap version first; let the gaps tell you what to
build next.
