# Hevy Clone — workout tracker

A self-hosted, mobile-first workout tracker that mirrors the Hevy app: log
workouts set by set, build routines, tick sets off as you go, run rest timers,
and track personal records, charts and body measurements.

Everything runs in your browser. Data is stored locally (and optionally synced
through Supabase so your phone and laptop share one history). No account, no
subscription.

## What's in it

**Home**
- Weekly bar chart (workouts / duration / volume / reps) for the last 8 weeks
- Workout history feed: title, duration, volume, records, per-exercise best set
- Per-workout menu: repeat, save as routine, edit, delete

**Workout tab**
- Start Empty Workout
- My Routines with folders (create, rename, delete, collapse), routine cards
  with Start Routine, and a menu to edit, duplicate, move, reorder, delete
- New Routine editor (title, notes, exercises, default sets and rest timer)
- Explore: 10 sample programs (Full Body, Push/Pull/Legs, Upper/Lower, Home,
  Arms & Abs) you can save to My Routines or start directly

**Logging a workout**
- Live duration, volume, set count and record count in the header
- Set table per exercise: SET · PREVIOUS · KG · REPS · ✓ (columns adapt to the
  exercise type: reps only, duration, distance, weighted or assisted bodyweight)
- Previous column shows what you did last time; tap it to copy the values, and
  blank sets are auto-filled from previous when you check them off
- Set types: warm-up (W), normal, failure (F), drop set (D); remove set
- Per-exercise notes, rest timer, supersets, replace, reorder, remove
- Rest timer starts automatically when a set is completed, with -15s / +15s /
  Skip, a beep and vibration at the end, and a manual quick-start timer
- Minimize the workout and keep browsing; a banner brings you back
- PR detection while you lift (heaviest weight, best 1RM, best set volume,
  most reps, longest duration/distance)
- Finish → Workout Complete summary; discard with confirmation
- If you changed a routine's exercises mid-workout you're offered to update it
- Edit any past workout after the fact

**Exercises**
- 280+ built-in exercises with primary/secondary muscles, equipment and type
- Search, filter by body part and category, create and edit custom exercises
- Exercise page: About, History (every set, PRs flagged), Charts (heaviest
  weight, one rep max, best set volume, session volume), Records (incl. per-rep
  records with estimated 1RM)

**Profile**
- Workouts count, week streak, 12-week chart
- Statistics: totals, period filters, muscle group set counts, most performed
- Calendar: month view with workout days and a per-day list
- Measures: body weight and body fat log with chart
- Settings: kg/lb, km/mi, default rest timer, sound, keep screen awake, show
  previous values, dark/light theme, first day of week, export/import JSON,
  delete all data

Installable as a PWA (Add to Home Screen) with safe-area support.

## Stack

- Next.js (App Router) + React + TypeScript, no UI framework, plain CSS
- All state in one client-side document persisted to `localStorage`
- Optional Supabase sync of that document (`supabase/schema.sql`)

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Production:

```bash
npm run build
npm run start      # binds to 127.0.0.1:3000
```

## Sync across devices (optional)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
3. Copy `.env.example` to `.env.local` and fill in the URL and anon key from
   **Settings → API**.
4. Restart the server. Settings → Data → Sync shows **On**.

The full document is pushed 1.5 s after any change and pulled whenever the tab
becomes visible. Newest `updatedAt` wins.

## Host on your own machine (Tailscale)

```bash
npm install && npm run build
npm run start                         # 127.0.0.1:3000 only
tailscale serve --bg http://localhost:3000
```

Open the printed `https://<host>.<tailnet>.ts.net` URL from your phone and add
it to the home screen. Keep it running with the provided service files:

- Linux: `deploy/workout.service` (systemd user unit)
- macOS: `deploy/com.workout.app.plist` (LaunchAgent)

Edit the working directory path inside whichever you use.

## Data

Settings → Export writes a JSON file with everything (workouts, routines,
custom exercises, measurements, settings). Import replaces the current data
with a previously exported file. Weights are stored in kg and distances in
metres regardless of display units.
