import { describe, expect, it } from 'vitest'
import { readViewState, writeViewState } from './url.ts'

describe('view state <-> url', () => {
  it('round-trips', () => {
    const s = readViewState('?t=amc-irving-mall-14,amc-grapevine-mills-24&d=2026-09-16&f=IMAX,Dolby&past=hide&q=orb', '2026-09-15')
    expect(s.theatreIds).toEqual(['amc-irving-mall-14', 'amc-grapevine-mills-24'])
    expect(s.date).toBe('2026-09-16')
    expect([...s.formats]).toEqual(['IMAX', 'Dolby'])
    expect(s.hidePast).toBe(true)
    expect(writeViewState(s, '2026-09-15')).toBe(
      '?t=amc-irving-mall-14%2Camc-grapevine-mills-24&d=2026-09-16&f=IMAX%2CDolby&past=hide&q=orb',
    )
  })
  it('falls back to defaults on junk', () => {
    const s = readViewState('?d=nope&f=VHS&t=..%2F', '2026-09-15')
    expect(s.date).toBe('2026-09-15')
    expect(s.formats.size).toBe(0)
    expect(s.theatreIds).toEqual([])
    expect(writeViewState(s, '2026-09-15')).toBe('')
  })
})
