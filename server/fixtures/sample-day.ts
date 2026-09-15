import type { RawMovie } from '../providers/types.ts'

type Slot = [time: string, format?: string]

function movie(title: string, runtimeMin: number, rating: string, slots: Slot[]): RawMovie {
  return {
    title,
    runtimeMin,
    rating,
    ticketUrl: 'https://www.amctheatres.com/',
    showings: slots.map(([time, format]) => ({ time, format: format ?? 'Standard' })),
  }
}

/** Placeholder titles: the layout is what matters here, not the film slate. */
export const SAMPLE_DAY: Record<string, RawMovie[]> = {
  'amc-irving-mall-14': [
    movie('Orbital', 148, 'PG-13', [
      ['12:30pm', 'IMAX'],
      ['4:00pm', 'IMAX'],
      ['7:15pm', 'IMAX'],
      ['10:30pm', 'IMAX'],
    ]),
    movie('The Long Way Home', 112, 'PG', [['11:20am'], ['2:10pm'], ['5:00pm']]),
    movie('Redline II', 125, 'R', [['1:15pm', 'Dolby Cinema'], ['4:30pm', 'Dolby Cinema'], ['8:00pm', 'Dolby Cinema'], ['11:05pm']]),
    movie('Quiet Hours', 135, 'R', [['6:10pm'], ['9:40pm']]),
    movie('Paper Tigers', 105, 'PG-13', [['12:00pm']]),
    movie('Hollow Sea', 160, 'PG-13', [
      ['2:45pm', 'IMAX'],
      ['6:30pm', 'IMAX'],
    ]),
  ],
  'amc-grapevine-mills-24': [
    movie('Orbital', 148, 'PG-13', [['1:00pm'], ['3:30pm', 'Dolby Cinema'], ['6:45pm'], ['7:00pm', 'Dolby Cinema'], ['10:15pm']]),
    movie('The Long Way Home', 112, 'PG', [['12:45pm'], ['6:30pm'], ['9:20pm']]),
    movie('Redline II', 125, 'R', [['3:00pm'], ['9:30pm']]),
    movie('Midnight Bakery', 98, 'PG', [['11:30am'], ['1:10pm'], ['2:15pm'], ['4:45pm'], ['5:40pm'], ['7:30pm']]),
    movie('Quiet Hours', 135, 'R', [['12:15pm'], ['3:40pm'], ['8:15pm']]),
    movie('Paper Tigers', 105, 'PG-13', [['11:00am'], ['2:30pm'], ['8:45pm']]),
    movie('Hollow Sea', 160, 'PG-13', [['9:00pm']]),
    movie('Saturday Static', 90, 'R', [['4:10pm'], ['5:15pm'], ['9:50pm'], ['10:00pm'], ['12:20am']]),
  ],
  __other__: [
    movie('Orbital', 148, 'PG-13', [['2:00pm'], ['7:30pm', 'IMAX']]),
    movie('Midnight Bakery', 98, 'PG', [['1:00pm'], ['6:00pm']]),
  ],
}
