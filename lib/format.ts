// TODO: should this be used if currency matters? I think everything should be exact
// 1234.5 => $1,234.50 or $1,235
export function formatAmount(n: number, exact = false): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: exact ? 2 : 0,
    maximumFractionDigits: exact ? 2 : 0,
  }).format(n);
}

// Handles the currency formatting, similar return like above
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

// Given a date string, will output something like "Jan 1"
export function formatShortDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
