import { ESTIMATED_RUNTIME_MIN, type Showtime } from './types.ts'

export interface LaidOutShowtime {
  showtime: Showtime
  startMin: number
  endMin: number
  lane: number
  runtimeEstimated: boolean
}

/** Gap kept between consecutive bars in one lane so they never touch. */
export const LANE_GAP_MIN = 15

/**
 * Greedy first-fit lane packing. Showtimes are sorted by start; each goes into the first lane
 * whose last bar ended at least LANE_GAP_MIN earlier, else a new lane. Deterministic for equal starts.
 */
export function packLanes(showtimes: Showtime[], runtimeMin: number | null): LaidOutShowtime[] {
  const runtime = runtimeMin ?? ESTIMATED_RUNTIME_MIN
  const sorted = [...showtimes].sort((a, b) => a.startMin - b.startMin || a.theatreId.localeCompare(b.theatreId))
  const laneEnds: number[] = []
  return sorted.map((showtime) => {
    let lane = laneEnds.findIndex((end) => end + LANE_GAP_MIN <= showtime.startMin)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(0)
    }
    const endMin = showtime.startMin + runtime
    laneEnds[lane] = endMin
    return { showtime, startMin: showtime.startMin, endMin, lane, runtimeEstimated: runtimeMin == null }
  })
}

export function laneCount(items: LaidOutShowtime[]): number {
  return items.reduce((n, it) => Math.max(n, it.lane + 1), 1)
}
