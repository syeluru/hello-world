import type { Minutes } from './types.ts'

export interface AxisRange {
  startMin: Minutes
  endMin: Minutes
}

const HOUR = 60
export const MIN_AXIS_HOURS = 8

/** Whole-hour range that contains every bar, at least MIN_AXIS_HOURS wide. */
export function axisRange(spans: { startMin: Minutes; endMin: Minutes }[]): AxisRange {
  if (spans.length === 0) return { startMin: 11 * HOUR, endMin: 24 * HOUR }
  let start = Infinity
  let end = -Infinity
  for (const s of spans) {
    start = Math.min(start, s.startMin)
    end = Math.max(end, s.endMin)
  }
  start = Math.floor(start / HOUR) * HOUR
  end = Math.ceil(end / HOUR) * HOUR
  if (end - start < MIN_AXIS_HOURS * HOUR) end = start + MIN_AXIS_HOURS * HOUR
  return { startMin: start, endMin: end }
}

export function hourTicks(range: AxisRange, stepHours = 1): Minutes[] {
  const ticks: Minutes[] = []
  for (let m = range.startMin; m <= range.endMin; m += stepHours * HOUR) ticks.push(m)
  return ticks
}

/** 0..1 position of a minute within the range. */
export function fraction(range: AxisRange, min: Minutes): number {
  return (min - range.startMin) / (range.endMin - range.startMin)
}
