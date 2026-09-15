import type { DataSource } from '../../src/domain/types.ts'
import type { TheatreConfig } from '../theatres.ts'

/** One movie's listing at one theatre on one day, as the source reports it. */
export interface RawMovie {
  title: string
  showings: RawShowing[]
  ticketUrl?: string | null
  /** Sources that know these fill them in; otherwise the runtime resolver is consulted. */
  runtimeMin?: number | null
  rating?: string | null
  posterUrl?: string | null
}

export interface RawShowing {
  /** Clock text as listed, e.g. "7:15pm". */
  time: string
  format: string
  auditorium?: string | null
  ticketUrl?: string | null
}

export interface TheatreListing {
  movies: RawMovie[]
  warnings: string[]
}

export interface ShowtimeProvider {
  readonly source: DataSource
  fetchListing(theatre: TheatreConfig, date: string): Promise<TheatreListing>
}

export interface MovieDetails {
  runtimeMin: number | null
  posterUrl?: string | null
}

export interface RuntimeResolver {
  lookup(title: string): Promise<MovieDetails>
}
