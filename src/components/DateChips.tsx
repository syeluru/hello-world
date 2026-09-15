import { addDays, fromDateKey } from '../domain/time.ts'

const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
const label = (d: Date) => `${weekday.format(d)} ${d.getDate()}`

export function DateChips({ today, date, onChange }: { today: string; date: string; onChange: (d: string) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  return (
    <div className="chips" role="tablist" aria-label="Date">
      {days.map((d, i) => (
        <button
          key={d}
          role="tab"
          aria-selected={d === date}
          className={`chip${d === date ? ' chip--on' : ''}`}
          onClick={() => onChange(d)}
        >
          {i === 0 ? 'Today, ' : ''}
          {label(fromDateKey(d))}
        </button>
      ))}
    </div>
  )
}
