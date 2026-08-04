# Tend Turn Companion

A companion web app for **Tend** (IV Studio) that any player can use in the
middle of a round to track the resources they've gained, how they used them,
their coins, and the tasks they've taken.

**Open `index.html` in any browser — phone or laptop — and play.** No build
step, no server, no install. Game state is saved in the browser
(localStorage), so a refresh or an accidentally closed tab doesn't lose the
game.

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
  season, and reminds you when a season is about to end so you don't miss
  season scoring. After round 12 the game flips to "complete."
- **Tasks.** One-tap logging for the four main tasks — Tend, Fish, Mine,
  Chop — plus free-text entries for anything else (watering, fences, etc.).
- **Ledger and history.** Everything in a round goes into a ledger with undo
  and per-entry delete; ending a round archives it, so you can always answer
  "what did I do in round 5?"
- **Final scoring pad.** A Score tab with the five victory point sources from
  the rulebook: three season objectives, Cargo Manifest stalls, badges, the
  Seasoned Explorer project, and neighbor bonuses — totaled live per player,
  leader highlighted.

Default resources (Wood, Fish, Ore, Geode, Crop, Milk) and tasks are all
editable on the Setup tab — rename, recolor, add, or remove them to match the
cards in play.

## Hosting it for your game group

Any static host works. The quickest option is GitHub Pages: enable Pages on
this repository (deploy from branch, root folder) and share the URL — everyone
at the table opens it on their own phone. Everyone plays simultaneously in
Tend, so each player runs their own copy (or shares one device using the
player tabs).
