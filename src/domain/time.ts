import type { Minutes } from './types.ts'

/** Parses "6:00pm", "12:15 AM", "18:30" into minutes since midnight. Returns null when unparseable. */
export function parseClock(text: string): Minutes | null {
  const m = text
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?$/)
  if (!m) return null
  let h = Number(m[1])
  const min = Number(m[2] ?? '0')
  const ap = m[3]?.replace(/\./g, '')
  if (h > 24 || min > 59) return null
  if (ap) {
    if (h < 1 || h > 12) return null
    if (ap === 'am' && h === 12) h = 0
    if (ap === 'pm' && h !== 12) h += 12
  }
  return h * 60 + min
}

/**
 * Showtime listings put after-midnight shows at the end of the same day.
 * Anything before this hour is treated as belonging to the previous evening.
 */
export const LATE_NIGHT_CUTOFF_MIN = 5 * 60

export function normalizeLateNight(min: Minutes): Minutes {
  return min < LATE_NIGHT_CUTOFF_MIN ? min + 24 * 60 : min
}

/** "7:15" without am/pm. */
export function fmtClock(min: Minutes): string {
  const h24 = Math.floor(min / 60) % 24
  const m = min % 60
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h}:${String(m).padStart(2, '0')}`
}

/** "7:15 PM". */
export function fmtClockAP(min: Minutes): string {
  const h24 = Math.floor(min / 60) % 24
  return `${fmtClock(min)} ${h24 >= 12 ? 'PM' : 'AM'}`
}

/** "7 PM" for axis ticks; "12 AM" for midnight. */
export function fmtHour(min: Minutes): string {
  const h24 = Math.floor(min / 60) % 24
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h} ${h24 >= 12 ? 'PM' : 'AM'}`
}

export function fmtRuntime(min: number): string {
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`
}

/** YYYY-MM-DD for a Date in the runtime's local zone. */
export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isDateKey(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(fromDateKey(s).getTime())
}

export function addDays(key: string, n: number): string {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + n)
  return toDateKey(d)
}

/** Minutes since midnight of `dateKey` for the given instant; negative or >1440 when outside that day. */
export function minutesInto(dateKey: string, now: Date): Minutes {
  const start = fromDateKey(dateKey)
  return Math.round((now.getTime() - start.getTime()) / 60000)
}
