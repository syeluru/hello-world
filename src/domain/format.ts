import type { FormatCategory } from './types.ts'

export const FORMAT_CATEGORIES: FormatCategory[] = ['IMAX', 'Dolby', 'Standard', 'Other']

export function formatCategory(format: string): FormatCategory {
  const f = format.trim().toLowerCase()
  if (f.includes('imax')) return 'IMAX'
  if (f.includes('dolby')) return 'Dolby'
  if (f === '' || f === 'standard' || f === 'digital' || f.includes('standard')) return 'Standard'
  return 'Other'
}

/** Short label drawn inside a bar. Standard shows carry no label. */
export function formatLabel(format: string): string {
  const cat = formatCategory(format)
  if (cat === 'Standard') return ''
  if (cat === 'IMAX' || cat === 'Dolby') return cat
  return format
    .replace(/\bat AMC\b/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}
