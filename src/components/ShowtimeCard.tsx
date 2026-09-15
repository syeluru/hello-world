import { useEffect, useRef } from 'react'
import type { LaidOutShowtime } from '../domain/lanes.ts'
import { fmtClockAP } from '../domain/time.ts'
import type { Movie, Theatre } from '../domain/types.ts'
import { ChevronIcon } from './Icons.tsx'

export interface ActiveShowtime {
  item: LaidOutShowtime
  movie: Movie
  theatre: Theatre
  color: string
  rect: DOMRect
  /** Clicked (stays open until dismissed) rather than merely hovered. */
  pinned: boolean
}

const WIDTH = 260
const GAP = 8

export function ShowtimeCard({ active, onClose }: { active: ActiveShowtime; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const { item, movie, theatre, color, rect, pinned } = active

  useEffect(() => {
    if (!pinned) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [pinned, onClose])

  const vw = window.innerWidth
  const vh = window.innerHeight
  const left = Math.max(GAP, Math.min(rect.left, vw - WIDTH - GAP))
  const below = rect.bottom + GAP
  const top = below + 150 < vh ? below : Math.max(GAP, rect.top - GAP - 150)

  const format = item.showtime.format && item.showtime.format !== 'Standard' ? item.showtime.format : 'Standard'
  const buyUrl =
    item.showtime.ticketUrl ?? `https://www.google.com/search?q=${encodeURIComponent(`${movie.title} ${theatre.name} showtimes`)}`

  return (
    <div
      ref={ref}
      className="card"
      role="dialog"
      aria-label={`${movie.title} at ${theatre.name}`}
      style={{ left, top }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div>
        <div className="card__title">{movie.title}</div>
        <div className="card__sub">
          {fmtClockAP(item.startMin)} – {fmtClockAP(item.endMin)}
          {item.runtimeEstimated ? ' (est.)' : ''} · {format}
        </div>
      </div>
      <div className="card__theatre">
        <span className="swatch" style={{ background: color }} />
        <span>
          {theatre.name}
          {item.showtime.auditorium ? ` · ${item.showtime.auditorium}` : ''}
        </span>
      </div>
      <a className="card__cta" href={buyUrl} target="_blank" rel="noreferrer">
        <span>{item.showtime.ticketUrl ? 'Buy tickets' : 'Find tickets'}</span>
        <ChevronIcon />
      </a>
    </div>
  )
}
