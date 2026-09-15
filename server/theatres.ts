import { slugify, unslugTheatre } from '../src/domain/slug.ts'
import type { Theatre } from '../src/domain/types.ts'

export interface TheatreConfig extends Theatre {
  /** Search phrase handed to the showtime source. */
  query: string
  location: string
}

const DFW = 'Dallas, Texas, United States'

/** Known theatres. Anything else can still be added by name from the UI. */
export const THEATRES: TheatreConfig[] = [
  t('AMC Irving Mall 14', 'Irving', 'Irving, Texas, United States'),
  t('AMC Grapevine Mills 24', 'Grapevine', 'Grapevine, Texas, United States'),
  t('AMC NorthPark 15', 'NorthPark', DFW),
  t('AMC Stonebriar 24', 'Stonebriar', 'Frisco, Texas, United States'),
  t('AMC Mesquite 30', 'Mesquite', 'Mesquite, Texas, United States'),
  t('AMC Firewheel 18', 'Firewheel', 'Garland, Texas, United States'),
  t('AMC The Parks At Arlington 18', 'Arlington', 'Arlington, Texas, United States'),
  t('AMC Highland Village 12', 'Highland Village', 'Highland Village, Texas, United States'),
]

export const DEFAULT_THEATRE_IDS = ['amc-irving-mall-14', 'amc-grapevine-mills-24']

function t(name: string, shortName: string, location: string): TheatreConfig {
  return { id: slugify(name), name, shortName, location, query: `${name} showtimes` }
}

export function findTheatre(id: string): TheatreConfig | undefined {
  return THEATRES.find((th) => th.id === id)
}

/** Registry hit, or a best-effort config for a theatre the user typed in by name. */
export function resolveTheatre(id: string): TheatreConfig {
  const known = findTheatre(id)
  if (known) return known
  const name = unslugTheatre(id)
  return { id, name, shortName: name.replace(/^AMC\s+/i, ''), location: DFW, query: `${name} showtimes` }
}

export function searchTheatres(q: string): TheatreConfig[] {
  const needle = q.trim().toLowerCase()
  if (!needle) return THEATRES
  return THEATRES.filter((th) => th.name.toLowerCase().includes(needle) || th.shortName.toLowerCase().includes(needle))
}
