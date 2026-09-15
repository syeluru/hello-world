import { SAMPLE_DAY } from '../fixtures/sample-day.ts'
import type { TheatreConfig } from '../theatres.ts'
import type { ShowtimeProvider, TheatreListing } from './types.ts'

/** Serves the same sample day for any date, so the UI can be developed without a key. */
export class FixtureProvider implements ShowtimeProvider {
  readonly source = 'fixture' as const

  async fetchListing(theatre: TheatreConfig): Promise<TheatreListing> {
    const slot = SAMPLE_DAY[theatre.id] ?? SAMPLE_DAY.__other__
    return { movies: slot, warnings: [] }
  }
}
