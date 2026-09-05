"use client";

import { formatCurrency } from "@/lib/format";
import { StatCard } from "@/components/stat-card";

type StatsStripProps = {
  investmentTotal: number;
  cashTotal: number;
  liabilityTotal: number;
  primaryCurrency: string;
  /** Both null until the transaction history loads. */
  avgMonthlyIncome: number | null;
  avgMonthlySpend: number | null;
};

export function StatsStrip({
  investmentTotal,
  cashTotal,
  liabilityTotal,
  primaryCurrency,
  avgMonthlyIncome,
  avgMonthlySpend,
}: StatsStripProps) {
  const netWorth = investmentTotal + cashTotal - liabilityTotal;

  const liquidTotal = investmentTotal + cashTotal;
  const pctInvested =
    liquidTotal > 0 ? Math.round((investmentTotal / liquidTotal) * 100) : null;

  // Savings rate = (income − spend) / income. Negative when spending > earning.
  const savingsRate =
    avgMonthlyIncome != null && avgMonthlyIncome > 0
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
        loading={avgMonthlyIncome == null}
      />
      <StatCard
        label="Savings Rate"
        value={savingsRate != null ? `${savingsRate.toFixed(0)}%` : "—"}
        sub="of income → surplus"
        valueClassName="text-xl"
        loading={avgMonthlyIncome == null}
      />
    </div>
  );
}
