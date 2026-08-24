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

- **Frontend**: Next.js (App Router, TypeScript) — deploys to **Vercel**
- **Backend**: **Supabase** (Postgres) for workouts & meals
- **AI**: meal → macros analysis via either
  - **Claude Code headless mode** (`claude -p`) using your Claude
    **subscription** — no API key, works when you run the app on your machine, or
  - the **Anthropic API** (`ANTHROPIC_API_KEY`) — required for the Vercel deployment
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

## Deploy to Vercel

1. Push this repo to GitHub and **Import** it in [Vercel](https://vercel.com/new).
2. Set environment variables in the Vercel project:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY` and `MEAL_PARSER=api`
3. Deploy.

**Why the API key on Vercel?** Headless mode runs the `claude` CLI, which only
exists (and is signed in) on your own machine — Vercel's serverless functions
can't use your subscription. Without a key, the deployed site still works for
workout logging and meal history; only the AI analysis shows a notice.

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
