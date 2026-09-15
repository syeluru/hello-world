import { describe, expect, it } from 'vitest'
import { formatCategory, formatLabel } from './format.ts'
import { laneCount, packLanes } from './lanes.ts'
import { buildRows } from './rows.ts'
import { axisRange, hourTicks } from './scale.ts'
import { slugify, unslugTheatre } from './slug.ts'
import { addDays, fmtClock, fmtClockAP, fmtHour, minutesInto, normalizeLateNight, parseClock } from './time.ts'
import type { Showtime, ShowtimesDay } from './types.ts'

const st = (id: string, startMin: number, theatreId = 't1', movieId = 'm1', format = 'Standard'): Showtime => ({
  id,
  movieId,
  theatreId,
  startMin,
  format,
})

describe('parseClock', () => {
  it('parses am/pm forms', () => {
    expect(parseClock('6:00pm')).toBe(18 * 60)
    expect(parseClock('12:15 AM')).toBe(15)
    expect(parseClock('12:00pm')).toBe(12 * 60)
    expect(parseClock('7pm')).toBe(19 * 60)
    expect(parseClock('11:45 p.m.')).toBe(23 * 60 + 45)
  })
  it('parses 24h and rejects junk', () => {
    expect(parseClock('18:30')).toBe(18 * 60 + 30)
    expect(parseClock('13:00pm')).toBeNull()
    expect(parseClock('soon')).toBeNull()
  })
  it('moves after-midnight shows to the end of the day', () => {
    expect(normalizeLateNight(parseClock('12:30am')!)).toBe(24 * 60 + 30)
    expect(normalizeLateNight(parseClock('10:30pm')!)).toBe(22 * 60 + 30)
  })
})

describe('formatting', () => {
  it('formats clocks past midnight', () => {
    expect(fmtClock(24 * 60 + 30)).toBe('12:30')
    expect(fmtClockAP(24 * 60 + 30)).toBe('12:30 AM')
    expect(fmtClockAP(19 * 60 + 15)).toBe('7:15 PM')
    expect(fmtHour(12 * 60)).toBe('12 PM')
    expect(fmtHour(24 * 60)).toBe('12 AM')
  })
  it('handles dates', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(minutesInto('2026-09-15', new Date(2026, 8, 15, 18, 40))).toBe(18 * 60 + 40)
    expect(minutesInto('2026-09-15', new Date(2026, 8, 16, 0, 30))).toBe(24 * 60 + 30)
  })
})

describe('formatCategory', () => {
  it('buckets source labels', () => {
    expect(formatCategory('IMAX with Laser at AMC')).toBe('IMAX')
    expect(formatCategory('Dolby Cinema')).toBe('Dolby')
    expect(formatCategory('Standard')).toBe('Standard')
    expect(formatCategory('')).toBe('Standard')
    expect(formatCategory('RealD 3D')).toBe('Other')
    expect(formatLabel('RealD 3D')).toBe('RealD 3D')
    expect(formatLabel('Laser at AMC')).toBe('Laser')
    expect(formatLabel('Standard')).toBe('')
  })
})

describe('packLanes', () => {
  it('keeps non-overlapping shows in one lane', () => {
    const out = packLanes([st('a', 600), st('b', 800)], 100)
    expect(out.map((o) => o.lane)).toEqual([0, 0])
    expect(laneCount(out)).toBe(1)
  })
  it('stacks overlapping shows and reuses freed lanes', () => {
    const out = packLanes([st('c', 700), st('a', 600), st('b', 650), st('d', 760)], 100)
    expect(out.map((o) => o.showtime.id)).toEqual(['a', 'b', 'c', 'd'])
    // a: 600-700 lane0, b: 650-750 lane1, c: 700-800 needs 715 gap -> lane2, d: 760-860 -> lane0 (700+15<=760)
    expect(out.map((o) => o.lane)).toEqual([0, 1, 2, 0])
  })
  it('uses an estimated runtime when unknown', () => {
    const out = packLanes([st('a', 600)], null)
    expect(out[0].endMin).toBe(720)
    expect(out[0].runtimeEstimated).toBe(true)
  })
})

describe('axisRange', () => {
  it('rounds to whole hours and enforces a minimum width', () => {
    expect(axisRange([{ startMin: 11 * 60 + 20, endMin: 13 * 60 + 5 }])).toEqual({ startMin: 660, endMin: 660 + 8 * 60 })
    expect(axisRange([{ startMin: 600, endMin: 25 * 60 }])).toEqual({ startMin: 600, endMin: 25 * 60 })
    expect(hourTicks({ startMin: 600, endMin: 780 })).toEqual([600, 660, 720, 780])
  })
})

describe('buildRows', () => {
  const day: ShowtimesDay = {
    date: '2026-09-15',
    source: 'fixture',
    fetchedAt: '',
    warnings: [],
    theatres: [{ id: 't1', name: 'T1', shortName: 'T1' }],
    movies: [
      { id: 'm1', title: 'Beta', runtimeMin: 90 },
      { id: 'm2', title: 'Alpha', runtimeMin: null },
    ],
    showtimes: [st('a', 600, 't1', 'm1'), st('b', 1200, 't1', 'm1', 'IMAX'), st('c', 900, 't1', 'm2')],
  }
  it('sorts by next upcoming showtime', () => {
    const rows = buildRows(day, { formats: new Set(), hidePast: false, nowMin: 700, query: '' })
    expect(rows.map((r) => r.movie.title)).toEqual(['Alpha', 'Beta'])
    expect(rows[1].anchorMin).toBe(1200)
  })
  it('applies format, past and text filters', () => {
    const imax = buildRows(day, { formats: new Set(['IMAX']), hidePast: false, nowMin: null, query: '' })
    expect(imax).toHaveLength(1)
    expect(imax[0].items).toHaveLength(1)
    const noPast = buildRows(day, { formats: new Set(), hidePast: true, nowMin: 1000, query: '' })
    expect(noPast.map((r) => r.movie.title)).toEqual(['Beta'])
    const q = buildRows(day, { formats: new Set(), hidePast: false, nowMin: null, query: 'alp' })
    expect(q.map((r) => r.movie.title)).toEqual(['Alpha'])
  })
})

describe('slug', () => {
  it('round-trips theatre names well enough', () => {
    expect(slugify('AMC Grapevine Mills 24')).toBe('amc-grapevine-mills-24')
    expect(unslugTheatre('amc-irving-mall-14')).toBe('AMC Irving Mall 14')
  })
})
