# Tend Turn Companion

A companion web app for **Tend** (IV Studio) that any player can use in the
middle of a round to track the resources they've gained, how they used them,
their coins, and the tasks they've taken.

**Open `index.html` in any browser — phone or laptop — and play.** No build
step, no server, no install. Game state is saved in the browser
(localStorage), so a refresh or an accidentally closed tab doesn't lose the
game.

## Exact original artwork (optional, local-only)

The app ships with color-matched chip icons. To see IV Studio's exact
original artwork instead, generate a local art bundle from the official
print-and-play PDFs you downloaded:

```
pip install pillow            # plus poppler-utils for pdfimages/pdftoppm
python3 tools/extract-art.py LowInk_FarmSheet.pdf LowInk_CargoManifest.pdf
```

This writes `art.js` next to `index.html`; the app picks it up automatically
(item icons, the pond's real tiles, and the manifest row-reward art). The
artwork is IV Studio's — `art.js` is gitignored and should stay on your own
machine for personal use with your copy of Tend.

## The digital sheets

IV Studio's official companion covers the digital scratch-offs, task cards,
and objectives — this app is the rest of the table: the sheets you'd normally
pencil.

- **Farm tab** — the farm sheet from the official printable, in exact shape:
  the irregular 11×12 grid with its pre-printed fences and tilled soil,
  paintable with any good, ~ tills, and = fences (tap a fence to rotate it).
  Below it: the chop and mine 10-step level tracks (tap to set your level;
  chopping/mining offers the level's yield with one tap), the three energy
  bars (locked → ready → used), upgrade checkboxes (tools, hatchet, pickaxe,
  rods, lures — Broken Bridge auto-unlocks River Fishing in the fish flow),
  the trellis counter, and both 8-step neighbor rewards tracks.
- **Cargo tab** — the cargo manifest from the printable: a paintable 12×8
  grid with the three stall sections, row rewards that light up on completed
  rows, and editable stall labels for the sheet variants.

## The digital table

The Play tab is now built around **taking tasks**, not just counting. Four
animated task cards (Fish, Chop, Mine, Tend) sit at the top of the screen —
they tease on hover and play a little scene when tapped (the fish leaps, the
axe swings, the pickaxe sparks, the watering can pours).

Fishing is the fully-realized flow: tap Fish → choose a location (Basic, or
River/Lake/Grotto once unlocked on the Setup tab) → the black and white dice
roll with a tumble animation (✦ is wild) → matching squares on the 5×5 grid
light up (an upgraded rod widens the catch area) → tap your catch, watch it
leap, and the four use-it-immediately options light up. Caught squares stay
crossed off per location, and undoing a catch un-crosses the square.

The fish species and grid layouts are **placeholders** until the real fishing
cards are photographed — the engine (location → dice → pick → use) is real,
and each grid is one small data block in `index.html` to swap.

## Built around Tend's rules

- **No storage — use it immediately.** When you gain a resource you tap it,
  and the app asks how you used it, mirroring the rulebook's four options:
  spend it on your sheets (badge, upgrade, soil, fence), sell it to the
  Corporate Commissary, place it in your Cargo Manifest, or gift it to your
  left or right neighbor.
- **Coins persist.** Selling a resource prompts for its commissary coin value
  and adds it to your coin total automatically; the coin counter also has
  manual +/− for spending on sheet costs.
- **12 rounds, 3 seasons.** The round banner tracks Round 1–12 and the current
  season (rounds 1–5, 6–9, 10–12), shows the five round phases from the guide
  card (Neighbor → Scoring → Setup → Growth → Task), and reminds you to score
  season objectives at the start of rounds 6 and 10 and at game end.
- **Coin programs.** One-tap buttons for the two 3-coin cargo sheet programs:
  the Intern Program (take any 1 main task) and the Buyback Program (cross out
  any 1 good) — each deducts the coins and logs the use.
- **Tasks.** One-tap logging for the four main tasks — Tend, Fish, Mine,
  Chop — plus free-text entries for anything else (watering, fences, etc.).
- **Ledger and history.** Everything in a round goes into a ledger with undo
  and per-entry delete; ending a round archives it, so you can always answer
  "what did I do in round 5?"
- **Final scoring pad.** A Score tab mirroring the scoring area on the cargo
  sheet: Objectives 1–3, Stalls 1–3, neighbor bonuses, and badges (including
  the Seasoned Explorer doubling) — totaled live per player, leader
  highlighted.

Default resources (Wood, Exo Wood, Copper, Iron, Fish, Plant, Milk, Geode) and
tasks are all editable on the Setup tab — rename, recolor, add, or remove them
to match the cards in play.

## Hosting it for your game group

Any static host works. The quickest option is GitHub Pages: enable Pages on
this repository (deploy from branch, root folder) and share the URL — everyone
at the table opens it on their own phone. Everyone plays simultaneously in
Tend, so each player runs their own copy (or shares one device using the
player tabs).
