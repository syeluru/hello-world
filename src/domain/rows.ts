import { formatCategory } from './format.ts'
import { laneCount, packLanes, type LaidOutShowtime } from './lanes.ts'
import type { FormatCategory, Minutes, Movie, ShowtimesDay } from './types.ts'

export interface RowFilters {
  /** Empty set means every format. */
  formats: ReadonlySet<FormatCategory>
  hidePast: boolean
  /** Minutes into the shown day for "now"; null when the shown day is not today. */
  nowMin: Minutes | null
  query: string
}

export interface MovieRow {
  movie: Movie
  items: LaidOutShowtime[]
  lanes: number
  /** First showtime that has not started yet, else the first of the day. */
  anchorMin: Minutes
}

export function buildRows(day: ShowtimesDay, filters: RowFilters): MovieRow[] {
  const q = filters.query.trim().toLowerCase()
  const byMovie = new Map(day.movies.map((m) => [m.id, m]))
  const grouped = new Map<string, MovieRow>()

  for (const st of day.showtimes) {
    const movie = byMovie.get(st.movieId)
    if (!movie) continue
    if (q && !movie.title.toLowerCase().includes(q)) continue
    if (filters.formats.size > 0 && !filters.formats.has(formatCategory(st.format))) continue
    if (filters.hidePast && filters.nowMin != null && st.startMin < filters.nowMin) continue
    let row = grouped.get(movie.id)
    if (!row) {
      row = { movie, items: [], lanes: 1, anchorMin: 0 }
      grouped.set(movie.id, row)
    }
    row.items.push({ showtime: st, startMin: st.startMin, endMin: st.startMin, lane: 0, runtimeEstimated: false })
  }

  const rows = [...grouped.values()].map((row) => {
    const items = packLanes(
      row.items.map((it) => it.showtime),
      row.movie.runtimeMin,
    )
    const now = filters.nowMin ?? -Infinity
    const upcoming = items.find((it) => it.startMin >= now)
    return { ...row, items, lanes: laneCount(items), anchorMin: (upcoming ?? items[0]).startMin }
  })

  return rows.sort((a, b) => a.anchorMin - b.anchorMin || a.movie.title.localeCompare(b.movie.title))
}

/** Which format categories actually occur in the day, in canonical order. */
export function presentFormats(day: ShowtimesDay): FormatCategory[] {
  const present = new Set(day.showtimes.map((s) => formatCategory(s.format)))
  return (['IMAX', 'Dolby', 'Standard', 'Other'] as FormatCategory[]).filter((f) => present.has(f))
}
