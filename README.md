# Tender Stack

A wallet that answers one question: **what do I pay with, here?**

You carry value in a dozen shapes — gift cards, house credits, a cashback
portal, a card with a bonus category — and each one only pays off at
particular places. Tender Stack keeps that ledger and cross-references it
against wherever you are, so a $300 stack of gift cards to the coffee shop
down the street stops being something you have to remember.

## What it does

- **Near me** — reads your location, finds the places you've pinned, and
  leads with the one you're standing in: how much stored value is waiting
  there and the exact order to present tender.
- **Look up** — search any place you've saved and get the same answer
  without being there.
- **Wallet** — everything you hold, grouped by kind, with balances,
  expiry dates and the rules for where each one actually works.

## How the recommendation works

Every entry declares its **coverage** (one place, a whole category, or
anywhere), its **channel** (in store, in the program's app, online only,
or a linked card), and what it's worth.

For a given place the app splits what applies into two layers:

1. **Pay with** — an ordered list. Stored value goes first, soonest to
   expire at the top, because prepaid money isn't money again until you
   spend it. Whatever's left falls to your best-rate card for that
   category.
2. **Stack on top** — cashback programs like Rakuten, which aren't a
   payment method at all but a routing decision you make before you buy.
   They carry their channel caveat with them.

Stored value bought below face value is scored on what it's actually
worth, not what you paid.

## Running it

`index.html` is the whole app — one file, no build, no dependencies. Open
it directly, or serve it over HTTPS (geolocation needs a secure origin).

Published as a Claude Artifact, it stores the wallet server-side through
the `db` capability, so the same data follows you from laptop to phone.
Opened as a plain file it falls back to `localStorage` and says so in the
footer.

## The honest limit on reminders

A web page can only check your location while it is open. The in-range
alert fires when you open the app near a pinned place, or while it's open
in the background on a walk — it cannot wake itself from your pocket.

For a nudge that genuinely arrives on its own, point an **iOS Shortcuts
arrival automation** at the app's URL: Shortcuts handles the geofence,
the app handles the answer.
