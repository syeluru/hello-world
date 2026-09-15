import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { addDays, isDateKey } from '../src/domain/time.ts'
import type { ShowtimesDay } from '../src/domain/types.ts'
import { assembleDay } from './assemble.ts'
import { TtlCache } from './cache.ts'
import { FixtureProvider } from './providers/fixture.ts'
import { SerpApiProvider } from './providers/serpapi.ts'
import { NoRuntimeResolver, TmdbResolver } from './providers/tmdb.ts'
import type { RuntimeResolver, ShowtimeProvider } from './providers/types.ts'
import { DEFAULT_THEATRE_IDS, resolveTheatre, searchTheatres } from './theatres.ts'

const SERPAPI_KEY = process.env.SERPAPI_KEY?.trim()
const TMDB_API_KEY = process.env.TMDB_API_KEY?.trim()
const PORT = Number(process.env.PORT ?? 8787)
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MINUTES ?? 15) * 60_000
const MAX_THEATRES = 8
const MAX_DAYS_AHEAD = 14

const provider: ShowtimeProvider = SERPAPI_KEY ? new SerpApiProvider(SERPAPI_KEY) : new FixtureProvider()
const runtimes: RuntimeResolver = TMDB_API_KEY ? new TmdbResolver(TMDB_API_KEY) : new NoRuntimeResolver()
const cache = new TtlCache<ShowtimesDay>(CACHE_TTL_MS)

export const app = new Hono()

app.get('/api/health', (c) => c.json({ ok: true, source: provider.source, runtimes: TMDB_API_KEY ? 'tmdb' : 'none' }))

app.get('/api/theatres', (c) => {
  const q = c.req.query('q') ?? ''
  return c.json({ theatres: searchTheatres(q), defaults: DEFAULT_THEATRE_IDS })
})

app.get('/api/showtimes', async (c) => {
  const ids = (c.req.query('theatres') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]+$/.test(s))
  if (ids.length === 0) return c.json({ error: 'Pass at least one theatre id in ?theatres=' }, 400)
  if (ids.length > MAX_THEATRES) return c.json({ error: `At most ${MAX_THEATRES} theatres at once` }, 400)

  const date = c.req.query('date') ?? ''
  if (!isDateKey(date)) return c.json({ error: 'Pass ?date=YYYY-MM-DD' }, 400)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: process.env.THEATRE_TZ || 'America/Chicago' }).format(new Date())
  if (date < addDays(today, -1) || date > addDays(today, MAX_DAYS_AHEAD)) {
    return c.json({ error: `Date must be between ${today} and ${addDays(today, MAX_DAYS_AHEAD)}` }, 400)
  }

  const theatres = [...new Set(ids)].map(resolveTheatre)
  const key = `${date}|${theatres.map((t) => t.id).join(',')}`
  try {
    const day = await cache.get(key, () => assembleDay(theatres, date, provider, runtimes))
    c.header('Cache-Control', 'public, max-age=60')
    return c.json(day)
  } catch (err) {
    console.error(err)
    return c.json({ error: err instanceof Error ? err.message : 'Failed to load showtimes' }, 502)
  }
})

if (process.env.NODE_ENV === 'production') {
  app.use('/*', serveStatic({ root: './dist' }))
  app.get('*', serveStatic({ path: './dist/index.html' }))
}

if (process.env.VITEST === undefined) {
  serve({ fetch: app.fetch, port: PORT }, () => {
    console.log(`showtimes server on http://localhost:${PORT} (source: ${provider.source}, runtimes: ${TMDB_API_KEY ? 'tmdb' : 'none'})`)
  })
}
