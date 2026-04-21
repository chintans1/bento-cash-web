import type { NormalizedAccount } from "@/lib/account-utils";

export type InvestableState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
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

export function isCheckingAccount(a: NormalizedAccount): boolean {
  return !a.isLiability && a.subtype === "checking";
}

export function isSavingsAccount(a: NormalizedAccount): boolean {
  return !a.isLiability && a.subtype === "savings";
}

export function getLastThreeFullMonths(
  now: Date
): Array<{ year: number; month: number }> {
  return [1, 2, 3].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
}
