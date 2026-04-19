// Shared helpers for hand-rolled SVG chart components.

/** Returns a "nice" step size for the given data range and desired tick count. */
export function niceStep(range: number, count: number): number {
  const raw = range / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  if (n <= 1) return mag;
  if (n <= 2) return 2 * mag;
  if (n <= 5) return 5 * mag;
  return 10 * mag;
}

/**
 * Expands [lo, hi] to round numbers and returns evenly-spaced tick values.
 * Falls back gracefully when lo === hi.
 */
export function niceAxis(
  lo: number,
  hi: number,
  count = 4
): { min: number; max: number; ticks: number[] } {
  if (lo === hi) {
    const pad = lo === 0 ? 1 : Math.abs(lo) * 0.1;
    return { min: lo - pad, max: hi + pad, ticks: [lo - pad, lo, hi + pad] };
  }
  const step = niceStep(hi - lo, count);
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let t = min; t <= max + step * 0.01; t += step) ticks.push(t);
  return { min, max, ticks };
}

/**
 * Compact currency label for y-axis ticks: "$120K", "$1.2M", "EUR 500", etc.
 * Avoids full Intl.NumberFormat to keep chart renders fast.
 */
export function fmtAxis(value: number, currency: string): string {
  const pfx =
    currency.toLowerCase() === "usd" ? "$" : currency.toUpperCase() + " ";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${pfx}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${pfx}${Math.round(abs / 1_000)}K`;
  return `${sign}${pfx}${Math.round(abs)}`;
}
