import type { NormalizedAccount } from "@/lib/account-utils";
import type { Transaction } from "@/lib/lunchmoney/client";

const INVESTMENT_TYPES = new Set(["investment", "brokerage"]);

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

export function isInvestment(a: NormalizedAccount): boolean {
  return (
    INVESTMENT_TYPES.has(a.type.toLowerCase()) ||
    (a.subtype !== null && INVESTMENT_SUBTYPES.has(a.subtype.toLowerCase()))
  );
}

export type Bucket = {
  label: string;
  color: string;
  subtypes: Set<string>;
};

export const BUCKETS: Bucket[] = [
  {
    label: "Retirement — Tax Deferred",
    color: "var(--cat-1)",
    subtypes: new Set([
      "401k",
      "403b",
      "457b",
      "sep ira",
      "simple ira",
      "pension",
    ]),
  },
  {
    label: "Retirement — Tax Free",
    color: "var(--cat-4)",
    subtypes: new Set(["roth ira", "roth 401k", "tfsa"]),
  },
  {
    label: "Traditional IRA",
    color: "var(--cat-5)",
    subtypes: new Set(["ira"]),
  },
  {
    label: "Taxable Brokerage",
    color: "var(--cat-6)",
    subtypes: new Set(["brokerage", "etf", "mutual fund", "stock plan"]),
  },
  {
    label: "HSA",
    color: "var(--cat-2)",
    subtypes: new Set(["hsa"]),
  },
  {
    label: "Education (529)",
    color: "var(--cat-2)",
    subtypes: new Set(["529"]),
  },
  {
    label: "Crypto",
    color: "var(--cat-7)",
    subtypes: new Set(["crypto"]),
  },
];

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

export type AllocationSlice = {
  id: string;
  label: string;
  institution: string | null;
  value: number;
  /** Share of the portfolio, 0–100. */
  share: number;
  lastUpdated: string | null;
};

/**
 * Investment accounts as portfolio slices, largest first.
 *
 * Lunch Money exposes balances per account and nothing below that — no
 * holdings, tickers, share counts or cost basis — so an account is the
 * finest grain a portfolio view can honestly show.
 */
export function computeAllocation(
  accounts: NormalizedAccount[]
): AllocationSlice[] {
  const investable = accounts.filter(
    (a) => isInvestment(a) && a.balanceValid && a.status !== "closed"
  );
  const total = investable.reduce((sum, a) => sum + a.toBase, 0);

  return investable
    .map((a) => ({
      id: a.id,
      label: a.name,
      institution: a.institution,
      value: a.toBase,
      share: total > 0 ? (a.toBase / total) * 100 : 0,
      lastUpdated: a.lastUpdated,
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Net money moved into investment accounts over the given transactions.
 *
 * Lunch Money has no cost basis or price history, so a true return figure
 * isn't available. What is knowable is how much went in: transactions carry
 * the account they belong to, and on an investment account a debit is a
 * contribution and a credit is a withdrawal.
 */
export function computeContributions(
  transactions: Transaction[],
  accounts: NormalizedAccount[]
): { net: number; contributed: number; withdrawn: number } {
  const investmentIds = new Set(
    accounts.filter(isInvestment).map((a) => `${a.source}-${a.rawId}`)
  );

  let contributed = 0;
  let withdrawn = 0;

  for (const tx of transactions) {
    if (tx.is_pending) continue;

    const key =
      tx.plaid_account_id != null
        ? `plaid-${tx.plaid_account_id}`
        : tx.manual_account_id != null
          ? `manual-${tx.manual_account_id}`
          : null;
    if (key === null || !investmentIds.has(key)) continue;

    // to_base is the primary-currency amount; fall back to the raw amount
    // rather than letting an absent field turn the total into NaN.
    const amount =
      typeof tx.to_base === "number" ? tx.to_base : parseFloat(tx.amount);
    if (!Number.isFinite(amount)) continue;

    if (amount > 0) contributed += amount;
    else withdrawn += Math.abs(amount);
  }

  return { net: contributed - withdrawn, contributed, withdrawn };
}
