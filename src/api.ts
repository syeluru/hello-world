import type { ShowtimesDay, Theatre } from './domain/types.ts'

export interface TheatreSearchResult {
  theatres: Theatre[]
  defaults: string[]
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  const body = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`)
  return body
}

export function fetchTheatres(q = '', signal?: AbortSignal): Promise<TheatreSearchResult> {
  return getJson(`/api/theatres?q=${encodeURIComponent(q)}`, signal)
}

export function fetchShowtimes(theatreIds: string[], date: string, signal?: AbortSignal): Promise<ShowtimesDay> {
  const params = new URLSearchParams({ theatres: theatreIds.join(','), date })
  return getJson(`/api/showtimes?${params}`, signal)
}
