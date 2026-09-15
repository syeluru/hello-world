import { slugify } from '../src/domain/slug.ts'
import { normalizeLateNight, parseClock } from '../src/domain/time.ts'
import type { Movie, ShowtimesDay, Showtime, Theatre } from '../src/domain/types.ts'
import type { RawMovie, RuntimeResolver, ShowtimeProvider } from './providers/types.ts'
import type { TheatreConfig } from './theatres.ts'

/** Fetches every theatre's listing, merges movies across theatres by title, and resolves runtimes. */
export async function assembleDay(
  theatres: TheatreConfig[],
  date: string,
  provider: ShowtimeProvider,
  runtimes: RuntimeResolver,
): Promise<ShowtimesDay> {
  const warnings: string[] = []
  const listings = await Promise.all(
    theatres.map(async (th) => {
      try {
        return { theatre: th, ...(await provider.fetchListing(th, date)) }
      } catch (err) {
        warnings.push(`${th.name}: ${err instanceof Error ? err.message : String(err)}`)
        return { theatre: th, movies: [] as RawMovie[], warnings: [] as string[] }
      }
    }),
  )

  const movies = new Map<string, Movie>()
  const showtimes: Showtime[] = []
  const pendingRuntimes: Promise<void>[] = []

  for (const listing of listings) {
    warnings.push(...listing.warnings.map((w) => `${listing.theatre.name}: ${w}`))
    for (const raw of listing.movies) {
      const id = slugify(raw.title)
      if (!id) continue
      let movie = movies.get(id)
      if (!movie) {
        movie = { id, title: raw.title, runtimeMin: raw.runtimeMin ?? null, rating: raw.rating ?? null, posterUrl: raw.posterUrl ?? null }
        movies.set(id, movie)
        if (movie.runtimeMin == null) {
          const m = movie
          pendingRuntimes.push(
            runtimes.lookup(raw.title).then((d) => {
              m.runtimeMin = d.runtimeMin
              m.posterUrl = m.posterUrl ?? d.posterUrl ?? null
            }),
          )
        }
      }
      for (const s of raw.showings) {
        const parsed = parseClock(s.time)
        if (parsed == null) {
          warnings.push(`${listing.theatre.name}: could not read showtime "${s.time}" for ${raw.title}`)
          continue
        }
        const startMin = normalizeLateNight(parsed)
        showtimes.push({
          id: `${listing.theatre.id}|${id}|${startMin}|${slugify(s.format)}`,
          movieId: id,
          theatreId: listing.theatre.id,
          startMin,
          format: s.format,
          auditorium: s.auditorium ?? null,
          ticketUrl: s.ticketUrl ?? raw.ticketUrl ?? null,
        })
      }
    }
  }
  await Promise.all(pendingRuntimes)

  const seen = new Set<string>()
  const dedupedShowtimes = showtimes.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)))

  return {
    date,
    theatres: theatres.map(toPublicTheatre),
    movies: [...movies.values()],
    showtimes: dedupedShowtimes,
    source: provider.source,
    fetchedAt: new Date().toISOString(),
    warnings,
  }
}

function toPublicTheatre(th: TheatreConfig): Theatre {
  return { id: th.id, name: th.name, shortName: th.shortName, location: th.location }
}
