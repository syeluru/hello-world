/** Minutes since local midnight of the showtime day. May exceed 1440 for after-midnight shows. */
export type Minutes = number

export interface Theatre {
  id: string
  name: string
  shortName: string
  /** Where the theatre is, used to scope the showtime search. */
  location?: string
}

export interface Movie {
  id: string
  title: string
  /** null when no source could tell us; the UI then draws an estimated bar. */
  runtimeMin: number | null
  rating?: string | null
  posterUrl?: string | null
}

export interface Showtime {
  id: string
  movieId: string
  theatreId: string
  startMin: Minutes
  /** Raw format label from the source, e.g. "IMAX with Laser", "Dolby Cinema", "Standard". */
  format: string
  auditorium?: string | null
  ticketUrl?: string | null
}

export type DataSource = 'fixture' | 'google'

export interface ShowtimesDay {
  /** YYYY-MM-DD in the theatres' local time. */
  date: string
  theatres: Theatre[]
  movies: Movie[]
  showtimes: Showtime[]
  source: DataSource
  fetchedAt: string
  warnings: string[]
}

export type FormatCategory = 'IMAX' | 'Dolby' | 'Standard' | 'Other'

/** Used for bar length when a movie's runtime is unknown. */
export const ESTIMATED_RUNTIME_MIN = 120
