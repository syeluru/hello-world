import { useEffect, useMemo, useState } from 'react'
import { fetchShowtimes, fetchTheatres } from './api.ts'
import { DateChips } from './components/DateChips.tsx'
import { FilterBar } from './components/FilterBar.tsx'
import { TheatreChips } from './components/TheatreChips.tsx'
import { Timeline } from './components/Timeline.tsx'
import { packLanes } from './domain/lanes.ts'
import { buildRows, presentFormats } from './domain/rows.ts'
import { axisRange } from './domain/scale.ts'
import { minutesInto, toDateKey } from './domain/time.ts'
import type { ShowtimesDay, Theatre } from './domain/types.ts'
import { useViewState } from './state/url.ts'

function useToday(): string {
  const [today, setToday] = useState(() => toDateKey(new Date()))
  useEffect(() => {
    const id = setInterval(() => setToday(toDateKey(new Date())), 60_000)
    return () => clearInterval(id)
  }, [])
  return today
}

function useNowMinutes(date: string, today: string): number | null {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return date === today ? minutesInto(date, now) : null
}

export default function App() {
  const today = useToday()
  const [view, update] = useViewState(today)
  const [day, setDay] = useState<ShowtimesDay | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const nowMin = useNowMinutes(view.date, today)
  const requestKey = `${view.theatreIds.join(',')}|${view.date}|${reloadKey}`
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const loading = view.theatreIds.length > 0 && loadedKey !== requestKey && error == null

  // First visit with no theatres in the URL: take the server's defaults.
  useEffect(() => {
    if (view.theatreIds.length > 0) return
    const ctrl = new AbortController()
    fetchTheatres('', ctrl.signal)
      .then((r) => update({ theatreIds: r.defaults }))
      .catch((e: Error) => e.name !== 'AbortError' && setError(e.message))
    return () => ctrl.abort()
  }, [view.theatreIds.length, update])

  useEffect(() => {
    if (view.theatreIds.length === 0) return
    const ctrl = new AbortController()
    fetchShowtimes(view.theatreIds, view.date, ctrl.signal)
      .then((d) => {
        setDay(d)
        setError(null)
        setLoadedKey(requestKey)
      })
      .catch((e: Error) => {
        if (e.name === 'AbortError') return
        setError(e.message)
        setLoadedKey(requestKey)
      })
    return () => ctrl.abort()
  }, [view.theatreIds, view.date, requestKey])

  const theatreIndex = useMemo(() => new Map(view.theatreIds.map((id, i) => [id, i])), [view.theatreIds])
  const known = useMemo(() => new Map<string, Theatre>((day?.theatres ?? []).map((t) => [t.id, t])), [day])

  const rows = useMemo(
    () => (day ? buildRows(day, { formats: view.formats, hidePast: view.hidePast, nowMin, query: view.query }) : []),
    [day, view.formats, view.hidePast, view.query, nowMin],
  )

  // Axis is derived from the whole day so filtering never makes it jump.
  const range = useMemo(() => {
    if (!day) return axisRange([])
    const runtimeOf = new Map(day.movies.map((m) => [m.id, m.runtimeMin]))
    const spans = [...new Set(day.showtimes.map((s) => s.movieId))].flatMap((id) =>
      packLanes(
        day.showtimes.filter((s) => s.movieId === id),
        runtimeOf.get(id) ?? null,
      ),
    )
    return axisRange(spans)
  }, [day])

  const staleForDate = day != null && day.date !== view.date
  const theatresForTimeline = day?.theatres ?? []

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          <div className="kicker">AMC · Dallas–Fort Worth</div>
          <h1 className="title">Showtimes</h1>
        </div>
        <DateChips today={today} date={view.date} onChange={(d) => update({ date: d })} />
      </header>

      <div className="toolbar">
        <TheatreChips theatreIds={view.theatreIds} known={known} onChange={(ids) => update({ theatreIds: ids })} />
        <FilterBar
          available={day ? presentFormats(day) : []}
          formats={view.formats}
          hidePast={view.hidePast}
          showPastToggle={nowMin != null}
          query={view.query}
          onFormats={(f) => update({ formats: f })}
          onHidePast={(v) => update({ hidePast: v })}
          onQuery={(q) => update({ query: q })}
        />
      </div>

      {error && (
        <div className="notice notice--error" role="alert">
          <span>Could not load showtimes: {error}</span>
          <button
            className="notice__action"
            onClick={() => {
              setError(null)
              setReloadKey((k) => k + 1)
            }}
          >
            Try again
          </button>
        </div>
      )}
      {day?.source === 'fixture' && (
        <div className="notice">
          <span>
            Showing <strong>sample data</strong>. Set <code>SERPAPI_KEY</code> on the server to load live Google showtimes, and{' '}
            <code>TMDB_API_KEY</code> for real runtimes and posters.
          </span>
        </div>
      )}
      {day && day.warnings.length > 0 && (
        <div className="notice">
          <ul>
            {day.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {day && !staleForDate ? (
        rows.length > 0 ? (
          <Timeline
            rows={rows}
            range={range}
            theatres={theatresForTimeline}
            theatreIndex={theatreIndex}
            nowMin={nowMin}
            totalShowtimes={rows.reduce((n, r) => n + r.items.length, 0)}
            loading={loading}
          />
        ) : (
          <div className="empty">
            <strong>{day.showtimes.length === 0 ? 'No showtimes listed' : 'Nothing matches these filters'}</strong>
            {day.showtimes.length === 0
              ? 'Try another date or theatre.'
              : 'Clear a format filter, show past showtimes, or change the search.'}
          </div>
        )
      ) : (
        <div className="timeline" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton" />
          ))}
        </div>
      )}

      {day && rows.length > 0 && (
        <p className="legend-note">
          Bar length = runtime. Overlapping showtimes stack within a row. Dimmed = already started. Faded end = runtime unknown, 2h assumed.
        </p>
      )}
    </div>
  )
}
