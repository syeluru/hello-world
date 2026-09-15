import type { TheatreConfig } from '../theatres.ts'
import type { RawMovie, ShowtimeProvider, TheatreListing } from './types.ts'

/**
 * Google's showtime panel, read through SerpApi (https://serpapi.com/showtimes-results).
 * A theatre-focused query ("<theatre> showtimes") yields one entry per day with the movies playing.
 */
export class SerpApiProvider implements ShowtimeProvider {
  readonly source = 'google' as const

  private readonly apiKey: string
  private readonly fetchFn: typeof fetch
  private readonly today: () => string

  constructor(apiKey: string, fetchFn: typeof fetch = fetch, today: () => string = localToday) {
    this.apiKey = apiKey
    this.fetchFn = fetchFn
    this.today = today
  }

  async fetchListing(theatre: TheatreConfig, date: string): Promise<TheatreListing> {
    const url = new URL('https://serpapi.com/search.json')
    url.searchParams.set('engine', 'google')
    url.searchParams.set('q', theatre.query)
    url.searchParams.set('location', theatre.location)
    url.searchParams.set('hl', 'en')
    url.searchParams.set('gl', 'us')
    url.searchParams.set('api_key', this.apiKey)

    const res = await this.fetchFn(url)
    if (!res.ok) throw new Error(`SerpApi ${res.status} for ${theatre.name}`)
    const body = (await res.json()) as SerpApiResponse
    if (body.error) throw new Error(`SerpApi: ${body.error}`)
    return parseSerpApiListing(body, date, this.today())
  }
}

export interface SerpApiResponse {
  error?: string
  showtimes?: SerpApiDay[]
}

export interface SerpApiDay {
  day?: string
  date?: string
  movies?: SerpApiMovie[]
  theaters?: unknown[]
}

export interface SerpApiMovie {
  name: string
  link?: string
  showing?: { time?: string[]; type?: string }[]
}

/** Pure mapping so it can be tested against captured responses. */
export function parseSerpApiListing(body: SerpApiResponse, date: string, today: string): TheatreListing {
  const warnings: string[] = []
  const days = body.showtimes ?? []
  if (days.length === 0) {
    warnings.push('Google returned no showtime panel for this theatre.')
    return { movies: [], warnings }
  }
  if (days.some((d) => d.theaters && !d.movies)) {
    warnings.push('Google answered with a movie-centric panel; try a more specific theatre name.')
  }
  const wanted = pickDay(days, date, today)
  if (!wanted) {
    warnings.push(`Google lists no showtimes for ${date} at this theatre yet.`)
    return { movies: [], warnings }
  }
  const movies: RawMovie[] = (wanted.movies ?? []).map((m) => ({
    title: m.name,
    ticketUrl: m.link ?? null,
    showings: (m.showing ?? []).flatMap((s) => (s.time ?? []).map((time) => ({ time, format: s.type?.trim() || 'Standard' }))),
  }))
  return { movies, warnings }
}

/**
 * Google's panel labels days as "Today", "Tomorrow", then weekday names, plus a "Sep 15" style date.
 * Match on the date text first; fall back to the array index counted from today.
 */
export function pickDay(days: SerpApiDay[], date: string, today: string): SerpApiDay | undefined {
  const target = shortDate(date)
  const byDate = days.find((d) => d.date && shortDate(normalizeShortDate(d.date, date)) === target)
  if (byDate) return byDate
  const offset = daysBetween(today, date)
  if (offset >= 0 && offset < days.length && !days[offset].date) return days[offset]
  const byLabel = days.find((d) => (offset === 0 && d.day === 'Today') || (offset === 1 && d.day === 'Tomorrow'))
  return byLabel
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** "2026-09-15" -> "sep 15". */
function shortDate(dateKey: string): string {
  const [, m, d] = dateKey.split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}`
}

/** "Sep 15" (any casing, optional trailing text) -> a YYYY-MM-DD in the target's year. */
function normalizeShortDate(text: string, near: string): string {
  const m = text
    .trim()
    .toLowerCase()
    .match(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2})/)
  if (!m) return ''
  const month = MONTHS.indexOf(m[1])
  if (month === -1) return ''
  return `${near.slice(0, 4)}-${String(month + 1).padStart(2, '0')}-${String(Number(m[2])).padStart(2, '0')}`
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.UTC(...ymd(b)) - Date.UTC(...ymd(a))) / 86400000)
}

function ymd(key: string): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number)
  return [y, m - 1, d]
}

function localToday(): string {
  const tz = process.env.THEATRE_TZ || 'America/Chicago'
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  return parts
}
