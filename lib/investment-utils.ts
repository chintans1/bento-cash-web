import type { NormalizedAccount } from "@/lib/account-utils";

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
    color: "bg-blue-500",
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
    color: "bg-emerald-500",
    subtypes: new Set(["roth ira", "roth 401k", "tfsa"]),
  },
  {
    label: "Traditional IRA",
    color: "bg-cyan-500",
    subtypes: new Set(["ira"]),
  },
  {
    label: "Taxable Brokerage",
    color: "bg-violet-500",
    subtypes: new Set(["brokerage", "etf", "mutual fund", "stock plan"]),
  },
  {
    label: "HSA",
    color: "bg-amber-500",
    subtypes: new Set(["hsa"]),
  },
  {
    label: "Education (529)",
    color: "bg-orange-500",
    subtypes: new Set(["529"]),
  },
  {
    label: "Crypto",
    color: "bg-rose-500",
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
