import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { posterTone, theatreColor } from '../colors.ts'
import { formatLabel } from '../domain/format.ts'
import type { LaidOutShowtime } from '../domain/lanes.ts'
import type { MovieRow } from '../domain/rows.ts'
import { fraction, hourTicks, type AxisRange } from '../domain/scale.ts'
import { fmtClock, fmtClockAP, fmtHour, fmtRuntime } from '../domain/time.ts'
import { ESTIMATED_RUNTIME_MIN, type Minutes, type Movie, type Theatre } from '../domain/types.ts'
import { ShowtimeCard, type ActiveShowtime } from './ShowtimeCard.tsx'

interface Props {
  rows: MovieRow[]
  range: AxisRange
  theatres: Theatre[]
  theatreIndex: Map<string, number>
  nowMin: Minutes | null
  totalShowtimes: number
  loading: boolean
}

export function Timeline({ rows, range, theatres, theatreIndex, nowMin, totalShowtimes, loading }: Props) {
  const [active, setActive] = useState<ActiveShowtime | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const ticks = hourTicks(range)
  const pct = (m: Minutes) => `${(fraction(range, m) * 100).toFixed(3)}%`
  const showNow = nowMin != null && nowMin >= range.startMin && nowMin <= range.endMin
  const byId = new Map(theatres.map((t) => [t.id, t]))

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setActive(null)
    const onScroll = () => setActive(null)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [active])

  // On a narrow screen the plot overflows; land the viewer just before "now" rather than at 11 AM.
  useEffect(() => {
    const el = scroller.current
    if (!el || nowMin == null || el.scrollWidth <= el.clientWidth) return
    const left = el.querySelector<HTMLElement>('.tl-left')
    const plot = el.querySelector<HTMLElement>('.tl-axis .tl-plot')
    if (!left || !plot) return
    const x = plot.offsetWidth * fraction(range, nowMin)
    el.scrollLeft = Math.max(0, x - (el.clientWidth - left.offsetWidth) * 0.2)
    // Runs once per shown day; later re-renders keep the user's scroll position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.startMin, range.endMin, nowMin == null])

  const open = (
    e: MouseEvent<HTMLButtonElement> | { currentTarget: HTMLButtonElement },
    item: LaidOutShowtime,
    movie: Movie,
    pinned: boolean,
  ) => {
    const theatre = byId.get(item.showtime.theatreId)
    if (!theatre) return
    setActive((prev) => ({
      item,
      movie,
      theatre,
      color: theatreColor(theatreIndex.get(theatre.id) ?? 0),
      rect: e.currentTarget.getBoundingClientRect(),
      pinned: pinned ? !(prev?.pinned && prev.item.showtime.id === item.showtime.id) : (prev?.pinned ?? false),
    }))
  }
  const closeUnlessPinned = () => setActive((prev) => (prev?.pinned ? prev : null))

  return (
    <div ref={scroller} className={`timeline${loading ? ' timeline--loading' : ''}`} aria-busy={loading}>
      <div className="tl-inner">
        <div className="tl-axis">
          <div className="tl-left">
            {rows.length} {rows.length === 1 ? 'movie' : 'movies'} · {totalShowtimes} showtimes
          </div>
          <div className="tl-plot">
            {ticks.map((t, i) => (
              <div
                key={t}
                className={`tick${i === 0 ? ' tick--first' : ''}${i === ticks.length - 1 ? ' tick--last' : ''}`}
                style={{ left: pct(t) }}
              >
                {fmtHour(t)}
              </div>
            ))}
            {showNow && (
              <div className="now-pill" style={{ left: pct(nowMin) }}>
                Now {fmtClockAP(nowMin)}
              </div>
            )}
          </div>
        </div>

        {rows.map((row) => {
          const height = `calc(var(--row-pad) * 2 + var(--lane-h) * ${row.lanes} + var(--lane-gap) * ${row.lanes - 1})`
          const runtime = row.movie.runtimeMin
          return (
            <div className="tl-row" key={row.movie.id}>
              <div className="tl-left">
                {row.movie.posterUrl ? (
                  <img className="poster" src={row.movie.posterUrl} alt="" loading="lazy" />
                ) : (
                  <div className="poster" style={{ background: posterTone(row.movie.title) }} />
                )}
                <div className="movie-meta">
                  <div className="movie-title" title={row.movie.title}>
                    {row.movie.title}
                  </div>
                  <div className="movie-sub">
                    {runtime != null ? fmtRuntime(runtime) : `~${fmtRuntime(ESTIMATED_RUNTIME_MIN)} est.`}
                    {row.movie.rating ? ` · ${row.movie.rating}` : ''}
                  </div>
                </div>
              </div>
              <div className="tl-plot" style={{ height }}>
                {ticks.slice(1, -1).map((t) => (
                  <div key={t} className="gridline" style={{ left: pct(t) }} />
                ))}
                {showNow && <div className="now-line" style={{ left: pct(nowMin) }} />}
                {row.items.map((item) => {
                  const th = item.showtime.theatreId
                  const past = nowMin != null && item.startMin < nowMin
                  const label = formatLabel(item.showtime.format)
                  const isActive = active?.item.showtime.id === item.showtime.id
                  const cls = ['bar', past && 'bar--past', item.runtimeEstimated && 'bar--est', isActive && 'bar--active']
                    .filter(Boolean)
                    .join(' ')
                  return (
                    <button
                      key={item.showtime.id}
                      className={cls}
                      style={{
                        left: pct(item.startMin),
                        width: `max(24px, calc(${pct(item.endMin)} - ${pct(item.startMin)}))`,
                        top: `calc(var(--row-pad) + (var(--lane-h) + var(--lane-gap)) * ${item.lane})`,
                        background: theatreColor(theatreIndex.get(th) ?? 0),
                      }}
                      aria-label={`${row.movie.title}, ${fmtClockAP(item.startMin)}${label ? `, ${label}` : ''}, ${byId.get(th)?.name ?? th}`}
                      onMouseEnter={(e) => open(e, item, row.movie, false)}
                      onMouseLeave={closeUnlessPinned}
                      onFocus={(e) => open(e, item, row.movie, false)}
                      onBlur={closeUnlessPinned}
                      onClick={(e) => open(e, item, row.movie, true)}
                    >
                      <span>{fmtClock(item.startMin)}</span>
                      {label && <span className="bar__format">{label}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      {active && <ShowtimeCard active={active} onClose={() => setActive(null)} />}
    </div>
  )
}
