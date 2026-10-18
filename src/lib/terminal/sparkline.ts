const BLOCKS = "▁▂▃▄▅▆▇█";

/** Render values as unicode block characters, scaled to `max` (defaults to the series max). */
export function sparkline(values: ArrayLike<number>, max?: number): string {
  let hi = max ?? 0;
  if (max === undefined) for (let i = 0; i < values.length; i++) hi = Math.max(hi, values[i]);
  let out = "";
  for (let i = 0; i < values.length; i++) {
    const t = hi > 0 ? values[i] / hi : 0;
    out += BLOCKS[Math.min(BLOCKS.length - 1, Math.max(0, Math.round(t * (BLOCKS.length - 1))))];
  }
  return out;
}
