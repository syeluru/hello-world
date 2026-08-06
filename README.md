# Tend Turn Companion

A companion web app for **Tend** (IV Studio) that any player can use in the
middle of a round to track the resources they've gained, how they used them,
their coins, and the tasks they've taken.

**Play solo:** open `tend.html` in any browser — no build step, no server.
Game state is saved in the browser (localStorage), so a refresh doesn't lose
the game.

## Game rooms (Vercel)

Deployed on Vercel, the landing page (`index.html`) lets anyone **create or
join a game room** named with a silly two-word phrase (`pink-dinosaur`).
Room URLs like `tend-companion-app.vercel.app/pink-dinosaur` are shareable —
everyone who opens one joins the room and appears in a live roster (green dot
when online, ★ on the room's creator) with their round, coins, and score.
Each player's sheets stay on their own device; each room gets its own saved
game.

### Deploying

1. On [vercel.com](https://vercel.com): **Add New → Project**, import this
   GitHub repository, and name the project `tend-companion-app` (that yields
   `tend-companion-app.vercel.app`). Set the **Production Branch** to this
   branch (or merge it to the default branch first). No framework preset or
   build command needed.
2. In the project's **Storage** tab, add **Upstash for Redis** (free tier) —
   it wires up the `UPSTASH_REDIS_REST_URL`/`TOKEN` env vars the room API
   (`api/room.js`) uses. Redeploy once after connecting.
3. Done — every push auto-deploys. Rooms expire 48 hours after their last
   activity.

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

Fishing is the fully-realized flow: tap Fish → choose a location (the Pond,
or River/Lake/Grotto once unlocked) → the black and white dice roll with a
tumble animation (✦ is wild) → on the Pond, matching squares light up on the
real grid from the farm sheet (Mambles, Pebblepuffs, Blobbers, and the wood
log; an upgraded rod widens the catch area) → tap your catch, watch it leap,
and the use-it options light up. Caught squares stay crossed off, and undo
un-crosses them.

**Nothing in the app is invented.** Everything comes from the rulebook
photos, the official sheet PDFs, the commissary placard, and the resource
listing card. Data that hasn't been photographed yet (River/Lake/Grotto
grids, badge project goods rows, neighbor track icons, per-species fish
prices) renders as "?" or asks at the table instead of guessing — the Setup
tab's Data status card lists exactly what's confirmed and what's pending.

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

Default resources use the names from the official resource listing (Wood, Exo
Wood, Stone, Copper, Iron, Fish, Pineapple, Wild Fruit, Pumpkin, Berries,
Egg, Wool, Milk, Geode, and the Blueprints) and are all editable on the Setup
tab — rename, recolor, add, or remove them to match the cards in play.

## Hosting it for your game group

Vercel (above) is the primary path since it powers the game rooms. Any static
host also works for solo play — e.g. GitHub Pages serving `tend.html`.
Everyone plays simultaneously in Tend, so each player runs their own copy (or
shares one device using the player tabs).
