# Game 10 Turn Companion

A companion web app for IV Studio's Game 10 that any player can use in the
middle of their turn to track resources, coins, and the actions they've taken.

**Open `index.html` in any browser — phone or laptop — and play.** No build
step, no server, no install. Game state is saved in the browser
(localStorage), so a refresh or an accidentally closed tab doesn't lose the
game.

## What it does

- **Play tab** — per-player resource and coin counters with big +/− tap
  targets, a live "this turn" delta on every resource, one-tap quick-action
  buttons, a free-text action logger, and a running ledger of everything
  gained, spent, and done this turn. **End turn** archives the ledger and
  passes to the next player (rounds advance automatically).
- **History tab** — every finished turn, newest first, showing exactly what
  each player gained, spent, and did.
- **Setup tab** — add/rename players, rename and recolor resources to match
  the game's actual tokens, edit the quick-action list, and start a new game.
- Undo the last entry, or delete any individual ledger entry.
- Light and dark themes follow your device setting.

## Configuring it for Game 10

The default resources ("Coins", "Resource A/B/C") and quick actions are
placeholders. Open **Setup** and rename them to the game's real resources and
turn actions. Once the rule book details are confirmed, the defaults in
`defaultState()` in `index.html` can be updated so the app starts pre-configured
for Game 10.

## Hosting it for your game group

Any static host works. The quickest option is GitHub Pages: enable Pages on
this repository (deploy from branch, root folder) and share the URL — everyone
at the table opens it on their own phone.
