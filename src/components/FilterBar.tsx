import type { FormatCategory } from '../domain/types.ts'
import { SearchIcon } from './Icons.tsx'

interface Props {
  available: FormatCategory[]
  formats: Set<FormatCategory>
  hidePast: boolean
  showPastToggle: boolean
  query: string
  onFormats: (f: Set<FormatCategory>) => void
  onHidePast: (v: boolean) => void
  onQuery: (q: string) => void
}

export function FilterBar({ available, formats, hidePast, showPastToggle, query, onFormats, onHidePast, onQuery }: Props) {
  const toggle = (f: FormatCategory) => {
    const next = new Set(formats)
    if (next.has(f)) next.delete(f)
    else next.add(f)
    onFormats(next)
  }
  return (
    <div className="toolbar__group">
      <label className="search">
        <SearchIcon />
        <input placeholder="Find a movie" value={query} onChange={(e) => onQuery(e.target.value)} aria-label="Find a movie" />
      </label>
      <span className="toolbar__sep" />
      <button
        className={`chip${formats.size === 0 ? ' chip--on' : ''}`}
        onClick={() => onFormats(new Set())}
        aria-pressed={formats.size === 0}
      >
        All formats
      </button>
      {available.map((f) => (
        <button key={f} className={`chip${formats.has(f) ? ' chip--on' : ''}`} onClick={() => toggle(f)} aria-pressed={formats.has(f)}>
          {f}
        </button>
      ))}
      {showPastToggle && (
        <>
          <span className="toolbar__sep" />
          <button className={`chip${hidePast ? ' chip--on' : ''}`} onClick={() => onHidePast(!hidePast)} aria-pressed={hidePast}>
            Hide past
          </button>
        </>
      )}
    </div>
  )
}
