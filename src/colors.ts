/** Categorical palette stepped for a dark surface; assigned to theatres in selection order. */
export const THEATRE_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']

export function theatreColor(index: number): string {
  return THEATRE_COLORS[index % THEATRE_COLORS.length]
}

/** Stable muted tone for a poster placeholder. */
export function posterTone(title: string): string {
  let h = 0
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) % 360
  return `oklch(34% 0.05 ${h})`
}
