import type { MovieDetails, RuntimeResolver } from './types.ts'

/** Runtime and poster from The Movie Database (https://developer.themoviedb.org). */
export class TmdbResolver implements RuntimeResolver {
  private readonly cache = new Map<string, Promise<MovieDetails>>()

  private readonly apiKey: string
  private readonly fetchFn: typeof fetch

  constructor(apiKey: string, fetchFn: typeof fetch = fetch) {
    this.apiKey = apiKey
    this.fetchFn = fetchFn
  }

  lookup(title: string): Promise<MovieDetails> {
    const key = title.trim().toLowerCase()
    let hit = this.cache.get(key)
    if (!hit) {
      hit = this.fetchDetails(title).catch(() => ({ runtimeMin: null, posterUrl: null }))
      this.cache.set(key, hit)
    }
    return hit
  }

  private async fetchDetails(title: string): Promise<MovieDetails> {
    const search = new URL('https://api.themoviedb.org/3/search/movie')
    search.searchParams.set('query', cleanTitle(title))
    search.searchParams.set('include_adult', 'false')
    search.searchParams.set('api_key', this.apiKey)
    const res = await this.fetchFn(search)
    if (!res.ok) throw new Error(`TMDB search ${res.status}`)
    const data = (await res.json()) as { results?: { id: number; poster_path?: string | null; popularity?: number }[] }
    const best = (data.results ?? []).sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0]
    if (!best) return { runtimeMin: null, posterUrl: null }

    const detail = new URL(`https://api.themoviedb.org/3/movie/${best.id}`)
    detail.searchParams.set('api_key', this.apiKey)
    const dres = await this.fetchFn(detail)
    if (!dres.ok) throw new Error(`TMDB detail ${dres.status}`)
    const d = (await dres.json()) as { runtime?: number | null; poster_path?: string | null }
    return {
      runtimeMin: d.runtime && d.runtime > 0 ? d.runtime : null,
      posterUrl: d.poster_path ? `https://image.tmdb.org/t/p/w185${d.poster_path}` : null,
    }
  }
}

/** Google decorates titles with the format sometimes ("Orbital: The IMAX Experience"). */
export function cleanTitle(title: string): string {
  return title
    .replace(/:?\s*(the\s+)?(imax|dolby)( cinema)?( experience| 3d)?\s*$/i, '')
    .replace(/\s*\((?:20\d\d|dubbed|subtitled|[^)]*sub)\)\s*$/i, '')
    .trim()
}

export class NoRuntimeResolver implements RuntimeResolver {
  async lookup(): Promise<MovieDetails> {
    return { runtimeMin: null, posterUrl: null }
  }
}
