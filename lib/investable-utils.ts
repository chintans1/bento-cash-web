import type { NormalizedAccount } from "@/lib/account-utils";
import { sumBalances } from "@/lib/account-utils";
import { computeAverageMonthlySpend } from "@/lib/lunchmoney/analytics";
import type { CategoryInfo } from "@/lib/lunchmoney/categories";
import type { Transaction } from "@/lib/lunchmoney/client";

export type InvestableSummary = {
  investableAmount: number;
  totalCheckingBalance: number;
  checkingFloor: number;
  totalSavingsBalance: number;
  savingsTarget: number;
  savingsFunded: boolean;
  savingsShortfall: number;
  avgMonthlySpend: number;
  savingsMonths: number;
};

export type InvestableState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | ({ status: "ready" } & InvestableSummary);

export function isCheckingAccount(a: NormalizedAccount): boolean {
  return !a.isLiability && a.subtype === "checking";
}

export function isSavingsAccount(a: NormalizedAccount): boolean {
  return !a.isLiability && a.subtype === "savings";
}

/**
 * What's free to invest: checking above one month of spend, but only once
 * savings covers `savingsMonths` of it. Until the emergency fund is funded,
 * nothing is investable.
 */
export function computeInvestable(
  accounts: NormalizedAccount[],
  monthlyTx: Transaction[][],
  catMap: Map<number, CategoryInfo>,
  savingsMonths: number
): InvestableSummary {
  const avgMonthlySpend = computeAverageMonthlySpend(monthlyTx, catMap);
  const totalCheckingBalance = sumBalances(accounts.filter(isCheckingAccount));
  const totalSavingsBalance = sumBalances(accounts.filter(isSavingsAccount));

  const savingsTarget = avgMonthlySpend * savingsMonths;
  const savingsFunded = totalSavingsBalance >= savingsTarget;

  return {
    investableAmount: savingsFunded
      ? Math.max(0, totalCheckingBalance - avgMonthlySpend)
      : 0,
    totalCheckingBalance,
    checkingFloor: avgMonthlySpend,
    totalSavingsBalance,
    savingsTarget,
    savingsFunded,
    savingsShortfall: Math.max(0, savingsTarget - totalSavingsBalance),
    avgMonthlySpend,
    savingsMonths,
  };
}
