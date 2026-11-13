import { isValid, parseISO } from "date-fns";

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

function nonEmptyText(value: unknown) {
  return typeof value === "string" ? value.trim() || null : null;
}

function merchantWebsite(value: unknown) {
  const text = nonEmptyText(value);
  if (!text || text.startsWith("/")) return null;
  const url = URL.parse(text.includes("://") ? text : `https://${text}`);
  if (
    url?.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !url.hostname.includes(".")
  ) {
    return null;
  }
  return { href: url.origin, label: url.hostname.replace(/^www\./, "") };
}

function isoDate(value: unknown) {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    isValid(parseISO(value))
    ? value
    : null;
}

export function plaidTransactionContext(
  metadata: Record<string, unknown> | null
) {
  const transaction = asRecord(metadata?.transaction) ?? metadata;
  const merchant = Array.isArray(transaction?.counterparties)
    ? transaction.counterparties
        .map(asRecord)
        .find((counterparty) => counterparty?.type === "merchant")
    : null;
  const channel =
    transaction?.payment_channel === "online"
      ? "Online"
      : transaction?.payment_channel === "in store"
        ? "In store"
        : null;
  const location = asRecord(transaction?.location);
  const category = asRecord(transaction?.personal_finance_category);
  const primary = nonEmptyText(category?.primary);
  const detailed = nonEmptyText(category?.detailed);
  const prefix = primary ? `${primary}_` : "";

  return {
    logo: plaidMerchantLogo(transaction),
    merchantName:
      nonEmptyText(transaction?.merchant_name) ?? nonEmptyText(merchant?.name),
    website:
      merchantWebsite(merchant?.website) ??
      merchantWebsite(transaction?.website),
    channel,
    location:
      channel === "In store"
        ? [location?.address, location?.city, location?.region]
            .map(nonEmptyText)
            .filter(Boolean)
            .join(", ") || null
        : null,
    authorizedDate: isoDate(transaction?.authorized_date),
    postedDate:
      transaction?.pending === false ? isoDate(transaction.date) : null,
    category: {
      primary,
      detail:
        detailed && prefix && detailed.startsWith(prefix)
          ? detailed.slice(prefix.length)
          : detailed,
    },
  };
}

function categoryNameKey(value: string) {
  return value
    .toLowerCase()
    .replace(/\band\b|&/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function plaidCategorySuggestion<T extends { id: number; name: string }>(
  category: { primary: string | null; detail: string | null },
  options: readonly T[]
) {
  const internetAndCable = category.detail === "INTERNET_AND_CABLE";
  for (const name of [
    category.detail,
    ...(internetAndCable ? ["Internet", "Utilities"] : []),
    category.primary,
  ]) {
    if (!name) continue;
    const key = categoryNameKey(name.replaceAll("_", " "));
    if (!key) continue;
    const matches = options.filter(
      (option) => option.id > 0 && categoryNameKey(option.name) === key
    );
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) return null;
  }
  return null;
}
