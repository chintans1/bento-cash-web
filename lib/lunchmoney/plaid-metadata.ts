function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parsePlaidMetadata(value: unknown) {
  if (typeof value !== "string") return asRecord(value);
  try {
    return asRecord(JSON.parse(value));
  } catch {
    return null;
  }
}

function plaidLogoUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const url = URL.parse(value);
  return url?.origin === "https://plaid-merchant-logos.plaid.com" &&
    !url.username &&
    !url.password
    ? url.href
    : null;
}

export function plaidMerchantLogo(metadata: Record<string, unknown> | null) {
  const logo = plaidLogoUrl(metadata?.logo_url);
  if (logo || !Array.isArray(metadata?.counterparties)) return logo;

  for (const entry of metadata.counterparties) {
    const counterparty = asRecord(entry);
    if (counterparty?.type !== "merchant") continue;
    const logo = plaidLogoUrl(counterparty.logo_url);
    if (logo) return logo;
  }
  return null;
}
