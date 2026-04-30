/** Formats a number as USD. exact=true → 2 decimal places; exact=false → rounded to whole dollars. */
export function formatAmount(n: number, exact = false): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: exact ? 2 : 0,
    maximumFractionDigits: exact ? 2 : 0,
  }).format(n);
}

/** Formats n with the given ISO currency code. Falls back to "1234 USD" style if the code is unsupported. */
export function formatCurrency(
  n: number,
  currency: string,
  exact = false
): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: exact ? 2 : 0,
      maximumFractionDigits: exact ? 2 : 0,
    }).format(n);
  } catch {
    // Fallback for unsupported currency codes
    return `${n.toFixed(exact ? 2 : 0)} ${currency.toUpperCase()}`;
  }
}

/** Converts a YYYY-MM-DD string to a short date like "Jan 1". Uses noon UTC to avoid timezone off-by-one. */
export function formatShortDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
