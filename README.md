# Trackline — personal fitness & nutrition tracker

A simple web app for two daily habits:

1. **Fitness** — log what you trained on a given day (multi-select: chest,
   triceps, shoulders, biceps, back, abs/core, quads, hamstrings, calves,
   plyometrics, flexibility, recovery), with optional notes and per-day history.
2. **Nutrition** — type **or speak** what you just ate; Claude breaks it into
   items and estimates calories, protein, carbs, and fat. Log it and watch
   today's totals.

**One codebase, three designs.** The theme switcher in the header swaps the
entire look, each inspired by a different deck:

| Theme | Inspiration | Look |
|---|---|---|
| **Pulse** | [Google Cloud: AI Trends 2025](https://www.deck.gallery/google-cloud-ai-trends/) | White, data-forward, Google blue with red/yellow/green accents, crisp hairline borders, Inter |
| **Bloom** | [APAC Beauty 2024](https://www.deck.gallery/apac-beauty-2024/) | Warm editorial: cream + blush + rose, Fraunces serif display, gold details, soft shadows |
| **Hexa** | [Hexaware Brand Guidelines 2024](https://www.deck.gallery/hexaware-brand-guidelines-2024/) | Deep navy, Manrope light headlines + Heebo body, electric blue→cyan gradients, geometric |

Your theme choice persists in the browser.

## Stack

- **Frontend**: Next.js (App Router, TypeScript) — self-hosted on your own
  machine, reachable from your devices over **Tailscale**
- **Backend**: **Supabase** (Postgres) for workouts & meals
- **AI**: meal → macros analysis via **Claude Code headless mode**
  (`claude -p`) using your Claude **subscription** — no API key. (An
  Anthropic-API backend also exists via `MEAL_PARSER=api` if you ever host
  somewhere without the `claude` CLI.)
- **Voice**: browser Web Speech API (Chrome / Edge / Safari)

No Supabase yet? The app runs in **demo mode** and stores data in
`localStorage` so you can try everything immediately.

## Quick start (local, uses your Claude subscription)

```bash
npm install
npm run dev        # http://localhost:3000
```

That's it for the nutrition AI: with no `ANTHROPIC_API_KEY` set, the API route
shells out to `claude -p` (Claude Code headless mode), which uses whatever
subscription your local `claude` CLI is signed into. Requires
[Claude Code](https://claude.com/claude-code) installed and logged in.

## Supabase setup (persistence)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql).
3. Copy `.env.example` to `.env.local` and fill in from **Settings → API**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. Restart `npm run dev`. The demo-mode banner disappears.

> Single-user setup: the schema enables RLS with permissive anon policies, so
> anyone with your URL + anon key can write. Keep them private; add Supabase
> Auth later if you want real protection.

## Host it on your own machine (via Tailscale)

Run the app on any always-on machine that has Node and Claude Code signed in,
and reach it from your phone/laptop anywhere through your tailnet.

1. **Build and start the server** on the host machine:
   ```bash
   npm install
   npm run build
   npm run start          # serves on http://localhost:3000
   ```
   `npm run start` deliberately binds to `127.0.0.1` only — the app is never
   exposed to your LAN or the internet directly; Tailscale is the front door.
2. **Expose it over Tailscale with HTTPS** (on the same machine):
   ```bash
   tailscale serve --bg http://localhost:3000
   ```
   Tailscale prints your URL, e.g. `https://mybox.tail1234.ts.net`. Open that
   from any device on your tailnet. If certs were never enabled, first run
   `tailscale cert` or enable **HTTPS Certificates** in the Tailscale admin
   console (MagicDNS required).

   > **Why `tailscale serve` and not just `http://100.x.y.z:3000`?** Browsers
   > only allow microphone access on HTTPS origins — voice logging would
   > silently stop working over plain HTTP. `serve` gives you a real cert,
   > and the app stays tailnet-only (don't use `tailscale funnel` unless you
   > deliberately want it public).

3. **Keep it running** after you log out — either a tmux session, or the
   provided systemd user service:
   ```bash
   mkdir -p ~/.config/systemd/user
   cp deploy/trackline.service ~/.config/systemd/user/
   # edit WorkingDirectory in the file to where you cloned this repo, then:
   systemctl --user daemon-reload
   systemctl --user enable --now trackline
   loginctl enable-linger $USER   # keep it alive when logged out
   ```
   (On a Mac, use `brew services`, a LaunchAgent, or just tmux instead.)

Because the server runs on your own machine, the meal analyzer uses the
`claude` CLI you're already signed into — your subscription, no API key. The
`claude -p` call runs as the same user that runs the server, so make sure that
user has run `claude` interactively once to log in.

**Redeploying after changes:** `git pull && npm install && npm run build &&
systemctl --user restart trackline`.

## Configuration reference

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase persistence (omit → browser-local demo mode) |
| `MEAL_PARSER` | `cli` = Claude Code headless (subscription), `api` = Anthropic API. Unset → auto (`api` if key present, else `cli`) |
| `ANTHROPIC_API_KEY` | Only for `MEAL_PARSER=api` |

## Moving this to its own repository

This project was built on a branch of `hello-world` because the Claude GitHub
integration couldn't create a new repository. To give it its own home:

```bash
# 1. Create an empty repo on GitHub (e.g. fitness-nutrition-tracker), then:
git clone --branch claude/fitness-nutrition-tracker-do8v3k \
  https://github.com/syeluru/hello-world.git fitness-nutrition-tracker
cd fitness-nutrition-tracker
git remote set-url origin https://github.com/syeluru/fitness-nutrition-tracker.git
git push -u origin HEAD:main
```
