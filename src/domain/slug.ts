export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Best-effort display name for a theatre slug typed by hand, e.g. "amc-northpark-15" -> "AMC Northpark 15". */
export function unslugTheatre(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => (w === 'amc' || w === 'imax' ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(' ')
}
