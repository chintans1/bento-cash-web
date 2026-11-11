import type { NormalizedAccount } from "@/lib/account-utils";

const INVESTMENT_TYPES = new Set(["investment", "brokerage", "cryptocurrency"]);

const INVESTMENT_SUBTYPES = new Set([
  "401k",
  "403b",
  "457b",
  "ira",
  "roth ira",
  "roth 401k",
  "sep ira",
  "simple ira",
  "brokerage",
  "hsa",
  "529",
  "tfsa",
  "crypto",
  "annuity",
  "mutual fund",
  "etf",
  "pension",
  "stock plan",
]);

export function isInvestmentKind(
  type: string,
  subtype: string | null
): boolean {
  return (
    INVESTMENT_TYPES.has(type.toLowerCase()) ||
    (subtype !== null && INVESTMENT_SUBTYPES.has(subtype.trim().toLowerCase()))
  );
}

export function isInvestment(a: NormalizedAccount): boolean {
  return isInvestmentKind(a.type, a.subtype);
}

export const BUCKETS = [
  {
    id: "tax-deferred-retirement",
    label: "Retirement — Tax Deferred",
    color: "oklch(62.3% 0.214 259.815)",
    subtypes: new Set([
      "401k",
      "403b",
      "457b",
      "ira",
      "sep ira",
      "simple ira",
      "pension",
    ]),
  },
  {
    id: "tax-free-retirement",
    label: "Retirement — Tax Free",
    color: "oklch(60% 0.118 184.704)",
    subtypes: new Set(["roth ira", "roth 401k", "tfsa"]),
  },
  {
    id: "taxable-brokerage",
    label: "Taxable Brokerage",
    color: "oklch(60.6% 0.25 292.717)",
    subtypes: new Set(["brokerage", "etf", "mutual fund", "stock plan"]),
  },
  {
    id: "hsa",
    label: "HSA",
    color: "oklch(76.9% 0.188 70.08)",
    subtypes: new Set(["hsa"]),
  },
  {
    id: "education",
    label: "Education (529)",
    color: "oklch(70.5% 0.213 47.604)",
    subtypes: new Set(["529"]),
  },
  {
    id: "crypto",
    label: "Crypto",
    color: "oklch(64.5% 0.246 16.439)",
    subtypes: new Set(["crypto"]),
  },
] as const;

export const OTHER_INVESTMENTS = {
  id: "other-investments",
  label: "Other investments",
  color: "oklch(55.4% 0.046 257.417)",
} as const;

export const INVESTMENT_GROUPS = [...BUCKETS, OTHER_INVESTMENTS] as const;
export type InvestmentGroupId = (typeof INVESTMENT_GROUPS)[number]["id"];

/**
 * Finds an account's allocation bucket. Providers sometimes omit the subtype
 * or report a Roth IRA as the generic `ira` subtype, so IRA names provide a
 * narrow fallback. Roth must be checked first because all other IRAs are
 * tax-deferred for allocation purposes.
 */
export function getInvestmentBucket(
  account: Pick<NormalizedAccount, "name" | "subtype"> & { type?: string }
): (typeof BUCKETS)[number] | undefined {
  if (account.type?.toLowerCase() === "cryptocurrency") {
    return BUCKETS.find((bucket) => bucket.id === "crypto");
  }

  const subtype = (account.subtype ?? "").trim().toLowerCase();
  const isNamedIra = /\bira\b/i.test(account.name);
  const isNamedRothIra = /\broth\s+ira\b/i.test(account.name);

  if (isNamedRothIra) {
    return BUCKETS.find((bucket) => bucket.id === "tax-free-retirement");
  }

  const subtypeBucket = BUCKETS.find((bucket) => bucket.subtypes.has(subtype));
  if (subtypeBucket) return subtypeBucket;

  if (isNamedIra) {
    return BUCKETS.find((bucket) => bucket.id === "tax-deferred-retirement");
  }

  return undefined;
}

export const ACCOUNT_TYPES = [
  "cash",
  "credit",
  "investment",
  "brokerage",
  "loan",
  "other asset",
  "other liability",
];

export const INVESTMENT_SUBTYPE_OPTIONS = [
  "401k",
  "403b",
  "457b",
  "ira",
  "roth ira",
  "roth 401k",
  "sep ira",
  "simple ira",
  "brokerage",
  "hsa",
  "529",
  "tfsa",
  "crypto",
  "annuity",
  "mutual fund",
  "etf",
  "pension",
  "stock plan",
];

export const OTHER_SUBTYPE_OPTIONS = [
  "checking",
  "savings",
  "credit card",
  "auto",
  "mortgage",
  "student",
  "home equity",
  "prepaid",
  "other",
];
