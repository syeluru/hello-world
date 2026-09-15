# AMC Showtimes Timeline — build plan

A visual front-end for AMC showtimes. You pick the theatres you care about and a date;
the app draws one row per movie and a bar per showtime (bar length = runtime,
bar color = theatre) on a shared time axis, so you can see the whole evening at a glance.

Mockup: https://claude.ai/artifact/GUsm8mEujymrVuBcpYbgZt (still: `mockup-desktop.png`)

## What the app does (v1 scope)

- Choose theatres (search by name or zip; chosen set is remembered and encoded in the URL).
- Choose a date (today + next 6 days).
- Timeline: one row per movie, sorted by next showtime; bars start at the showtime and
  are as long as the runtime; overlapping showtimes for the same movie stack inside the row.
- Color = theatre. The theatre chips at the top double as legend and selector.
- Filters: format (IMAX / Dolby / Standard), "hide past", movie name search.
- "Now" line; showtimes that already started are dimmed.
- Hover / tap a bar: format, auditorium, start–end, and a "Buy tickets on AMC" link.
- Phone layout: same rows, time axis scrolls sideways.

Out of scope for v1: buying tickets in-app, seat maps, accounts, notifications.

## The one real risk: where the data comes from

AMC has no open JSON feed. Options, in order of preference:

1. **SerpApi Google Showtimes** (chosen). Google lists AMC showtimes per theatre with
   formats. Paid beyond a small free allowance. Google does not give runtimes, so TMDB fills
   those in.
2. **AMC Developer API** (developers.amctheatres.com) as a later upgrade. Catalog APIs are
   offered to developers who request a vendor key (`X-AMC-Vendor-Key` header). Would give
   exact runtimes, auditoriums and ticket links.
3. **Scraping amctheatres.com or Fandango** — not planned. Both are bot-protected and against
   their terms; AMC's site returned a Cloudflare block from a cloud host.

Because of this, the app is built against a `ShowtimeProvider` interface with a fixture
provider first. Swapping in the real provider is a config change, not a rewrite.

The AMC key must never ship to the browser, so there is a thin server that holds the key,
calls AMC, caches for ~15 minutes, and serves the front-end.

## Stack

- Front-end: Vite + React + TypeScript. Timeline drawn with plain absolutely-positioned
  divs (no charting library needed; the mockup is already this).
- Server: Node + Hono. Two routes: `GET /api/theatres?q=` and
  `GET /api/showtimes?theatres=a,b,c&date=YYYY-MM-DD`. Serves the built front-end too.
- Tests: Vitest for lane packing, time scale, and provider mapping. Playwright smoke test
  for the page.
- Tooling: ESLint, Prettier, GitHub Actions (lint + test on PR).
- Deploy: one Node process (Fly.io or Render). Vercel also works if we split the API into
  a serverless function.

## Phases

### Phase 0 — Repo bootstrap (half a session)

- New repo `amc-showtimes-timeline` (name open to change).
- Vite React TS scaffold, ESLint/Prettier, Vitest, CI workflow, this PLAN.md, mockup
  screenshots in `docs/`.
- Deliverable: `npm run dev` shows an empty shell; CI green.

### Phase 1 — Domain model and fixtures (half a session)

- Types: `Theatre { id, name, shortName, color }`, `Movie { id, title, runtimeMin, rating,
posterUrl }`, `Showtime { movieId, theatreId, startsAt, format, auditorium, ticketUrl }`.
- Pure functions, unit-tested: lane packing (greedy, with turnover gap), time scale
  (minutes -> px), grouping by movie, sort by next showtime, filters.
- Fixture JSON that mirrors the mockup (3 theatres, 8 movies, 43 showtimes).
- Deliverable: green tests, `FixtureProvider` returns the sample day.

### Phase 2 — Timeline UI (one to two sessions)

- Header: date chips, theatre chips with remove, "Add theatre" search, format filter,
  hide-past toggle, movie search.
- Axis with hour ticks and the "Now" marker; rows with poster tile, title, runtime, rating.
- Bars with theatre color, format tag, dimming for past, stacked lanes for overlaps.
- Tooltip / tap sheet with details and the buy link.
- URL state (`?t=metreon,kabuki&d=2026-09-14&f=imax`), so a view is bookmarkable.
- Phone layout: sticky title column, horizontally scrolling axis.
- Keyboard: bars are focusable; tooltip opens on focus.
- Deliverable: the mockup, live, driven by fixtures.

### Phase 3 — Real data (one session, gated on the vendor key)

- `ShowtimeProvider` interface; `AmcProvider` mapping AMC theatre/movie/showtime responses
  into the domain types; error and empty states; 15-minute in-memory cache on the server.
- Theatre search backed by AMC's theatre lookup (by name / zip / lat-long).
- If the key has not arrived: `SerpApiProvider` behind the same interface, or a manual
  JSON import so the app is still useful.
- Deliverable: your real theatres, today's real showtimes.

### Phase 4 — Polish and deploy (half a session)

- Posters from the AMC movie feed, loading skeletons, a friendly "no showtimes" state.
- Deploy; README with setup (`AMC_VENDOR_KEY` env var) and screenshots.

## Decisions (settled 2026-09-15)

1. Direction **A**: one row per movie, bars colored by theatre.
2. Starting theatres: **AMC Irving Mall 14** and **AMC Grapevine Mills 24** (Dallas–Fort Worth).
3. Repo name `amc-showtimes-timeline`.
4. No AMC vendor key for now. Live data comes from Google's showtime panel via SerpApi, with
   runtimes and posters from TMDB. The provider interface keeps the AMC API as a later option.

## Status

- Phase 0, 1 and 2: done. The UI runs end to end against the sample day.
- Phase 3: providers written and unit-tested against the documented response shape. Needs a
  `SERPAPI_KEY` (and ideally `TMDB_API_KEY`) to be exercised against real responses; the
  first live run may need small mapping fixes.
- Phase 4: posters and empty/loading states done; deployment not yet set up.
