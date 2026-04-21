import type { ManualAccount, PlaidAccount } from "@/lib/lunchmoney/client";
import type { AccountType } from "@lunch-money/lunch-money-js-v2";

// TODO: should vehicle, real estate be considered liabilities?
const LIABILITY_TYPES = new Set(["credit", "loan", "other liability"]);

const ALL_CAPS_SUBTYPES = new Set([
  "ira",
  "tfsa",
  "hsa",
  "401k",
  "403b",
  "457b",
  "529",
  "etf",
]);

export type NormalizedAccount = {
  id: string;
  rawId: number;
  name: string;
  institution: string | null;
  type: AccountType;
  subtype: string | null; // TODO: I can make this strongly typed
  balance: number;
  currency: string;
  toBase: number;
  balanceValid: boolean;
  isLiability: boolean;
  lastUpdated: string | null;
  source: "plaid" | "manual";
  status: string;
};

export function normalizeManual(a: ManualAccount): NormalizedAccount {
  return {
    id: `manual-${a.id}`,
    rawId: a.id,
    name: a.display_name ?? a.name,
    institution: a.institution_name,
    type: a.type,
    subtype: a.subtype,
    balance: parseFloat(a.balance),
    currency: a.currency,
    toBase: a.to_base,
    balanceValid: true,
    isLiability: LIABILITY_TYPES.has(a.type),
    lastUpdated: a.balance_as_of,
    source: "manual",
    status: a.status,
  };
}

export function normalizePlaid(a: PlaidAccount): NormalizedAccount {
  const revoked = a.status === "revoked";
  return {
    id: `plaid-${a.id}`,
    rawId: a.id,
    name: a.display_name ?? a.name,
    institution: a.institution_name,
    type: a.type as AccountType,
    subtype: a.subtype ?? null,
    balance: parseFloat(a.balance),
    currency: a.currency,
    toBase: a.to_base,
    balanceValid: !revoked,
    isLiability: LIABILITY_TYPES.has(a.type),
    lastUpdated: a.balance_last_update,
    source: "plaid",
    status: a.status,
  };
}

export function formatSubtype(subtype: string): string {
  const lower = subtype.toLowerCase();
  if (ALL_CAPS_SUBTYPES.has(lower)) {
    return subtype.toUpperCase();
  }

  return subtype.charAt(0).toUpperCase() + subtype.slice(1);
}

// Turning a date string to "today", "yesterday" or "Jan 1"
// TODO: it should return year if its not the current year
export function formatUpdated(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);

  if (diffDays === 0) {
    return "today";
  } else if (diffDays === 1) {
    return "yesterday";
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function normalizeAccounts(
  manual: ManualAccount[],
  plaid: PlaidAccount[]
): NormalizedAccount[] {
  return [...manual.map(normalizeManual), ...plaid.map(normalizePlaid)];
}

export function groupByInstitution(
  accounts: NormalizedAccount[]
): [string, NormalizedAccount[]][] {
  const map = new Map<string, NormalizedAccount[]>();

  for (const a of accounts) {
    const key = a.institution ?? "Other";
    const group = map.get(key) ?? [];
    group.push(a);
    map.set(key, group);
  }

  // Return a grouping by institution, ordered alphabetically on name
  return Array.from(map.entries()).map(
    ([institution, accs]) =>
      [
        institution,
        accs.slice().sort((a, b) => a.name.localeCompare(b.name)),
      ] as [string, NormalizedAccount[]]
  );
}
