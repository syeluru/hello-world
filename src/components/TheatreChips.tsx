import { useEffect, useRef, useState } from 'react'
import { fetchTheatres } from '../api.ts'
import { theatreColor } from '../colors.ts'
import { slugify, unslugTheatre } from '../domain/slug.ts'
import type { Theatre } from '../domain/types.ts'
import { PlusIcon, SearchIcon, XIcon } from './Icons.tsx'

interface Props {
  theatreIds: string[]
  /** Names for ids we have data for; ids without one are shown de-slugged. */
  known: Map<string, Theatre>
  onChange: (ids: string[]) => void
}

export function TheatreChips({ theatreIds, known, onChange }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="chips" aria-label="Theatres">
      {theatreIds.map((id, i) => (
        <span key={id} className="chip chip--theatre">
          <span className="swatch" style={{ background: theatreColor(i) }} />
          <span>{known.get(id)?.name ?? unslugTheatre(id)}</span>
          <button
            className="icon-btn"
            aria-label={`Remove ${known.get(id)?.name ?? id}`}
            disabled={theatreIds.length === 1}
            onClick={() => onChange(theatreIds.filter((t) => t !== id))}
          >
            <XIcon />
          </button>
        </span>
      ))}
      <span className="popover-anchor">
        <button className="chip chip--dashed" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <PlusIcon />
          <span>Add theatre</span>
        </button>
        {open && (
          <AddTheatrePopover
            exclude={theatreIds}
            onPick={(id) => {
              onChange([...theatreIds, id])
              setOpen(false)
            }}
            onClose={() => setOpen(false)}
          />
        )}
      </span>
    </div>
  )
}

function AddTheatrePopover({ exclude, onPick, onClose }: { exclude: string[]; onPick: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [all, setAll] = useState<Theatre[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    fetchTheatres('', ctrl.signal)
      .then((r) => setAll(r.theatres))
      .catch(() => {})
    return () => ctrl.abort()
  }, [])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const needle = q.trim().toLowerCase()
  const matches = all.filter((t) => !exclude.includes(t.id) && (!needle || t.name.toLowerCase().includes(needle)))
  const customId = slugify(q)
  const customIsNew = needle.length >= 4 && customId && !all.some((t) => t.id === customId) && !exclude.includes(customId)

  return (
    <div className="popover" ref={ref}>
      <label className="search">
        <SearchIcon />
        <input
          autoFocus
          placeholder="Theatre name, e.g. AMC NorthPark 15"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            if (matches[0]) onPick(matches[0].id)
            else if (customIsNew) onPick(customId)
          }}
        />
      </label>
      <div className="popover__list">
        {matches.map((t) => (
          <button key={t.id} className="popover__item" onClick={() => onPick(t.id)}>
            <span>{t.name}</span>
            <small>{t.location?.split(',')[0]}</small>
          </button>
        ))}
        {customIsNew && (
          <button className="popover__item" onClick={() => onPick(customId)}>
            <span>Use “{unslugTheatre(customId)}”</span>
            <small>search Google</small>
          </button>
        )}
        {matches.length === 0 && !customIsNew && (
          <div className="popover__hint">Type a full theatre name to add one that is not listed.</div>
        )}
      </div>
    </div>
  )
}
