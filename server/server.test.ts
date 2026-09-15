import { describe, expect, it } from 'vitest'
import { assembleDay } from './assemble.ts'
import { TtlCache } from './cache.ts'
import { FixtureProvider } from './providers/fixture.ts'
import { parseSerpApiListing, pickDay, type SerpApiResponse } from './providers/serpapi.ts'
import { cleanTitle, NoRuntimeResolver } from './providers/tmdb.ts'
import { resolveTheatre, searchTheatres } from './theatres.ts'

const sample: SerpApiResponse = {
  showtimes: [
    {
      day: 'Today',
      date: 'Sep 15',
      movies: [
        {
          name: 'Orbital',
          link: 'https://g.co/x',
          showing: [
            { time: ['4:00pm', '7:15pm'], type: 'IMAX' },
            { time: ['12:30am'], type: 'Standard' },
          ],
        },
        { name: 'Midnight Bakery', showing: [{ time: ['1:10pm'] }] },
      ],
    },
    { day: 'Tomorrow', date: 'Sep 16', movies: [{ name: 'Orbital', showing: [{ time: ['6:00pm'], type: 'Dolby Cinema' }] }] },
    { day: 'Thu', movies: [] },
  ],
}

describe('SerpApi parsing', () => {
  it('picks the day by date text, then by offset', () => {
    expect(pickDay(sample.showtimes!, '2026-09-16', '2026-09-15')?.day).toBe('Tomorrow')
    expect(pickDay(sample.showtimes!, '2026-09-17', '2026-09-15')?.day).toBe('Thu')
    expect(pickDay(sample.showtimes!, '2026-09-20', '2026-09-15')).toBeUndefined()
  })
  it('flattens showings into raw movies', () => {
    const out = parseSerpApiListing(sample, '2026-09-15', '2026-09-15')
    expect(out.warnings).toEqual([])
    expect(out.movies[0]).toEqual({
      title: 'Orbital',
      ticketUrl: 'https://g.co/x',
      showings: [
        { time: '4:00pm', format: 'IMAX' },
        { time: '7:15pm', format: 'IMAX' },
        { time: '12:30am', format: 'Standard' },
      ],
    })
    expect(out.movies[1].showings[0].format).toBe('Standard')
  })
  it('warns on an empty or movie-centric panel', () => {
    expect(parseSerpApiListing({}, '2026-09-15', '2026-09-15').warnings[0]).toMatch(/no showtime panel/)
    expect(parseSerpApiListing({ showtimes: [{ day: 'Today', theaters: [] }] }, '2026-09-15', '2026-09-15').warnings[0]).toMatch(
      /movie-centric/,
    )
  })
  it('strips format decorations from titles before lookup', () => {
    expect(cleanTitle('Orbital: The IMAX Experience')).toBe('Orbital')
    expect(cleanTitle('Orbital IMAX')).toBe('Orbital')
    expect(cleanTitle('Orbital (2026)')).toBe('Orbital')
    expect(cleanTitle('Hollow Sea')).toBe('Hollow Sea')
  })
})

describe('assembleDay', () => {
  it('merges movies across theatres and normalizes late shows', async () => {
    const theatres = ['amc-irving-mall-14', 'amc-grapevine-mills-24'].map(resolveTheatre)
    const day = await assembleDay(theatres, '2026-09-15', new FixtureProvider(), new NoRuntimeResolver())
    expect(day.source).toBe('fixture')
    expect(day.theatres.map((t) => t.shortName)).toEqual(['Irving', 'Grapevine'])
    const orbital = day.movies.find((m) => m.id === 'orbital')!
    expect(orbital.runtimeMin).toBe(148)
    const orbitalShows = day.showtimes.filter((s) => s.movieId === 'orbital')
    expect(orbitalShows).toHaveLength(9)
    const late = day.showtimes.find((s) => s.movieId === 'saturday-static' && s.startMin > 24 * 60)
    expect(late?.startMin).toBe(24 * 60 + 20)
    expect(new Set(day.showtimes.map((s) => s.id)).size).toBe(day.showtimes.length)
  })
  it('keeps going when one theatre fails', async () => {
    const failing = {
      source: 'google' as const,
      fetchListing: async (th: { id: string }) => {
        if (th.id === 'amc-irving-mall-14') throw new Error('boom')
        return { movies: [{ title: 'Orbital', showings: [{ time: '7:00pm', format: 'Standard' }] }], warnings: [] }
      },
    }
    const day = await assembleDay(
      ['amc-irving-mall-14', 'amc-grapevine-mills-24'].map(resolveTheatre),
      '2026-09-15',
      failing,
      new NoRuntimeResolver(),
    )
    expect(day.showtimes).toHaveLength(1)
    expect(day.movies[0].runtimeMin).toBeNull()
    expect(day.warnings).toEqual(['AMC Irving Mall 14: boom'])
  })
})

describe('theatres', () => {
  it('resolves unknown ids to a usable config', () => {
    const th = resolveTheatre('amc-northpark-15')
    expect(th.name).toBe('AMC NorthPark 15')
    const custom = resolveTheatre('amc-somewhere-8')
    expect(custom.name).toBe('AMC Somewhere 8')
    expect(custom.query).toBe('AMC Somewhere 8 showtimes')
    expect(searchTheatres('grape').map((t) => t.id)).toEqual(['amc-grapevine-mills-24'])
  })
})

describe('TtlCache', () => {
  it('collapses concurrent calls and expires', async () => {
    let calls = 0
    const cache = new TtlCache<number>(50)
    const [a, b] = await Promise.all([cache.get('k', async () => ++calls), cache.get('k', async () => ++calls)])
    expect([a, b]).toEqual([1, 1])
    await new Promise((r) => setTimeout(r, 60))
    expect(await cache.get('k', async () => ++calls)).toBe(2)
  })
  it('does not cache failures', async () => {
    const cache = new TtlCache<number>(1000)
    await expect(cache.get('k', async () => Promise.reject(new Error('x')))).rejects.toThrow('x')
    expect(await cache.get('k', async () => 7)).toBe(7)
  })
})
