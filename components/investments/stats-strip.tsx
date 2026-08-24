"use client";

import { formatCurrency } from "@/lib/format";
import { StatCard } from "@/components/stat-card";

// ── Props ─────────────────────────────────────────────────────────────────────

export type StatsStripProps = {
  investmentTotal: number;
  cashTotal: number;
  liabilityTotal: number;
  primaryCurrency: string;
  /** null = transaction history not yet loaded */
  avgMonthlyIncome: number | null;
  /** null = transaction history not yet loaded */
  avgMonthlySpend: number | null;
  txHistoryReady: boolean;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function StatsStrip({
  investmentTotal,
  cashTotal,
  liabilityTotal,
  primaryCurrency,
  avgMonthlyIncome,
  avgMonthlySpend,
  txHistoryReady,
}: StatsStripProps) {
  const netWorth = investmentTotal + cashTotal - liabilityTotal;

  const liquidTotal = investmentTotal + cashTotal;
  const pctInvested =
    liquidTotal > 0 ? Math.round((investmentTotal / liquidTotal) * 100) : null;

  // Savings rate = (income − spend) / income. Can be negative if spending > earning.
  const savingsRate =
    txHistoryReady && avgMonthlyIncome != null && avgMonthlyIncome > 0
      ? ((avgMonthlyIncome - (avgMonthlySpend ?? 0)) / avgMonthlyIncome) * 100
      : null;

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        label="Net Worth"
        value={formatCurrency(netWorth, primaryCurrency, false)}
        sub="investments + cash − liabilities"
        valueClassName="text-xl"
      />
      <StatCard
        label="Invested"
        value={pctInvested !== null ? `${pctInvested}%` : "—"}
        sub="of liquid assets in markets"
        valueClassName="text-xl"
      />
      <StatCard
        label="Avg Monthly Income"
        value={
          avgMonthlyIncome != null
            ? formatCurrency(avgMonthlyIncome, primaryCurrency, false)
            : "—"
        }
        sub="6-month average"
        valueClassName="text-xl"
        loading={!txHistoryReady}
      />
      <StatCard
        label="Savings Rate"
        value={savingsRate != null ? `${savingsRate.toFixed(0)}%` : "—"}
        sub="of income → surplus"
        valueClassName="text-xl"
        loading={!txHistoryReady}
      />
    </div>
  );
}
