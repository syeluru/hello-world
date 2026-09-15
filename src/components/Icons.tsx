const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function XIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" {...base} aria-hidden="true">
      <path d="M2 2l6 6M8 2l-6 6" />
    </svg>
  )
}

export function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" {...base} aria-hidden="true">
      <path d="M6 2v8M2 6h8" />
    </svg>
  )
}

export function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...base} aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  )
}

export function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" {...base} aria-hidden="true">
      <path d="M4.5 2.5L8 6l-3.5 3.5" />
    </svg>
  )
}
