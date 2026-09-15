import { useCallback, useEffect, useState } from 'react'
import type { FormatCategory } from '../domain/types.ts'
import { FORMAT_CATEGORIES } from '../domain/format.ts'
import { isDateKey } from '../domain/time.ts'

export interface ViewState {
  theatreIds: string[]
  date: string
  formats: Set<FormatCategory>
  hidePast: boolean
  query: string
}

export function readViewState(search: string, today: string): ViewState {
  const p = new URLSearchParams(search)
  const date = p.get('d') ?? ''
  const formats = (p.get('f') ?? '').split(',').filter((f): f is FormatCategory => (FORMAT_CATEGORIES as string[]).includes(f))
  return {
    theatreIds: (p.get('t') ?? '').split(',').filter((s) => /^[a-z0-9-]+$/.test(s)),
    date: isDateKey(date) ? date : today,
    formats: new Set(formats),
    hidePast: p.get('past') === 'hide',
    query: p.get('q') ?? '',
  }
}

export function writeViewState(state: ViewState, today: string): string {
  const p = new URLSearchParams()
  if (state.theatreIds.length) p.set('t', state.theatreIds.join(','))
  if (state.date !== today) p.set('d', state.date)
  if (state.formats.size) p.set('f', [...state.formats].join(','))
  if (state.hidePast) p.set('past', 'hide')
  if (state.query) p.set('q', state.query)
  const s = p.toString()
  return s ? `?${s}` : ''
}

/** View state mirrored into the query string so a view is bookmarkable and back/forward work. */
export function useViewState(today: string): [ViewState, (patch: Partial<ViewState>) => void] {
  const [state, setState] = useState(() => readViewState(window.location.search, today))

  useEffect(() => {
    const onPop = () => setState(readViewState(window.location.search, today))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [today])

  const update = useCallback(
    (patch: Partial<ViewState>) => {
      setState((prev) => {
        const next = { ...prev, ...patch }
        const url = writeViewState(next, today)
        if (url !== window.location.search) window.history.replaceState(null, '', url || window.location.pathname)
        return next
      })
    },
    [today],
  )

  return [state, update]
}
