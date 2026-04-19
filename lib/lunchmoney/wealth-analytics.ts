// Pure functions for wealth projections, portfolio allocation, cash flow
// summaries, and FIRE metrics. No API calls — operates on already-fetched data.

import type { Transaction } from "./client";
import type { NormalizedAccount } from "@/lib/account-utils";
import type { CategoryInfo } from "./categories";

// --- Growth projection ---

export interface ProjectionPoint {
  year: number;
  conservative: number; // 4% annual return
  moderate: number; // 7% annual return
  aggressive: number; // 10% annual return
}

export function projectNetWorth(
  currentNetWorth: number,
  monthlyContribution: number,
  years: number
): ProjectionPoint[] {
  let c = currentNetWorth;
  let m = currentNetWorth;
  let a = currentNetWorth;

  const points: ProjectionPoint[] = [
    { year: 0, conservative: c, moderate: m, aggressive: a },
  ];

  const cR = 0.04 / 12;
  const mR = 0.07 / 12;
  const aR = 0.1 / 12;

  for (let y = 1; y <= years; y++) {
    for (let mo = 0; mo < 12; mo++) {
      c = c * (1 + cR) + monthlyContribution;
      m = m * (1 + mR) + monthlyContribution;
      a = a * (1 + aR) + monthlyContribution;
    }
    points.push({ year: y, conservative: c, moderate: m, aggressive: a });
  }

  return points;
}

// --- Portfolio allocation ---

export type AllocationBucket =
  | "cash"
  | "investments"
  | "crypto"
  | "property"
  | "other";

export interface AllocationSlice {
  bucket: AllocationBucket;
  label: string;
  total: number;
  pct: number;
  colorVar: string; // CSS custom property, e.g. "--chart-1"
}

const BUCKET_META: Record<
  AllocationBucket,
  { label: string; colorVar: string }
> = {
  investments: { label: "Investments", colorVar: "--chart-1" },
  cash: { label: "Cash", colorVar: "--chart-2" },
  crypto: { label: "Crypto", colorVar: "--chart-3" },
  property: { label: "Property", colorVar: "--chart-4" },
  other: { label: "Other", colorVar: "--chart-5" },
};

const INVESTMENT_SUBTYPES = new Set([
  "brokerage",
  "ira",
  "401k",
  "403b",
  "457b",
  "roth",
  "529",
  "hsa",
]);

function classifyAccount(a: NormalizedAccount): AllocationBucket {
  const type = a.type?.toLowerCase() ?? "";
  const sub = a.subtype?.toLowerCase() ?? "";
  if (type === "cryptocurrency") return "crypto";
  if (type === "real estate" || type === "vehicle") return "property";
  if (INVESTMENT_SUBTYPES.has(sub) || type.includes("investment"))
    return "investments";
  if (
    sub === "checking" ||
    sub === "savings" ||
    sub === "cd" ||
    type === "cash"
  )
    return "cash";
  return "other";
}

export function computeAllocation(
  accounts: NormalizedAccount[]
): AllocationSlice[] {
  const totals = new Map<AllocationBucket, number>();

  for (const a of accounts) {
    if (a.isLiability || !a.balanceValid || a.status === "closed") continue;
    const bucket = classifyAccount(a);
    totals.set(bucket, (totals.get(bucket) ?? 0) + a.toBase);
  }

  const grandTotal = Array.from(totals.values()).reduce((s, v) => s + v, 0);
  if (grandTotal === 0) return [];

  return (Object.keys(BUCKET_META) as AllocationBucket[])
    .filter((b) => (totals.get(b) ?? 0) > 0)
    .map((b) => ({
      bucket: b,
      label: BUCKET_META[b].label,
      total: totals.get(b) ?? 0,
      pct: ((totals.get(b) ?? 0) / grandTotal) * 100,
      colorVar: BUCKET_META[b].colorVar,
    }));
}

// --- Monthly cash flow summary ---

export interface MonthlySummary {
  year: number;
  month: number; // 1-indexed
  income: number; // absolute value of negative-amount (credit) transactions
  expenses: number; // positive-amount transactions excluding transfers
  net: number; // income - expenses
}

export function computeMonthlySummary(
  transactions: Transaction[],
  catMap: Map<number, CategoryInfo>,
  year: number,
  month: number
): MonthlySummary {
  let income = 0;
  let expenses = 0;

  for (const tx of transactions) {
    const amt = parseFloat(tx.amount);
    const cat = tx.category_id != null ? catMap.get(tx.category_id) : undefined;
    if (cat?.exclude_from_totals) continue;
    if (amt < 0) income += Math.abs(amt);
    else if (amt > 0) expenses += amt;
  }

  return { year, month, income, expenses, net: income - expenses };
}

// --- FIRE metrics ---

export interface FIREMetrics {
  fireNumber: number; // 25× annual expenses (4% withdrawal rule)
  yearsToFIRE: number | null; // null = unreachable within 100 years
  savingsRate: number; // 0–1
  monthlySavings: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}

export function computeFIREMetrics(
  currentNetWorth: number,
  summaries: MonthlySummary[]
): FIREMetrics {
  const empty: FIREMetrics = {
    fireNumber: 0,
    yearsToFIRE: null,
    savingsRate: 0,
    monthlySavings: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
  };
  if (summaries.length === 0) return empty;

  const avgIncome =
    summaries.reduce((s, m) => s + m.income, 0) / summaries.length;
  const avgExpenses =
    summaries.reduce((s, m) => s + m.expenses, 0) / summaries.length;
  const monthlySavings = Math.max(0, avgIncome - avgExpenses);
  const savingsRate = avgIncome > 0 ? monthlySavings / avgIncome : 0;
  const fireNumber = avgExpenses * 12 * 25;

  if (currentNetWorth >= fireNumber && fireNumber > 0) {
    return {
      fireNumber,
      yearsToFIRE: 0,
      savingsRate,
      monthlySavings,
      monthlyIncome: avgIncome,
      monthlyExpenses: avgExpenses,
    };
  }

  // Compound monthly at 7% (moderate) until FIRE number is reached
  const monthlyRate = 0.07 / 12;
  let value = currentNetWorth;
  let months = 0;
  while (value < fireNumber && months < 1200) {
    value = value * (1 + monthlyRate) + monthlySavings;
    months++;
  }

  return {
    fireNumber,
    yearsToFIRE: months < 1200 ? months / 12 : null,
    savingsRate,
    monthlySavings,
    monthlyIncome: avgIncome,
    monthlyExpenses: avgExpenses,
  };
}
