"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useToken } from "@/hooks/use-token";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { NoTokenPrompt } from "@/components/no-token-prompt";
import { useMonthNavigation } from "@/hooks/use-month-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthSelector } from "@/components/dashboard/month-selector";
import { QuickStatsPanel } from "@/components/dashboard/quick-stats-panel";
import { NetCashFlowBar } from "@/components/dashboard/net-cash-flow-bar";
import { DailySpendChart } from "@/components/dashboard/daily-spend-chart";
import { CategoryRow, CAT_COLORS } from "@/components/dashboard/category-row";
import { TopMerchantsCard } from "@/components/dashboard/top-merchants-card";
import { BudgetProgressCard } from "@/components/dashboard/budget-progress-card";
import { SubscriptionsCard } from "@/components/dashboard/subscriptions-card";
import { MONTH_NAMES } from "@/lib/date-utils";

export default function HomePage() {
  const { token } = useToken();
  const now = new Date();
  const {
    year: selectedYear,
    month: selectedMonth,
    onPrev,
    onNext,
  } = useMonthNavigation(now.getFullYear(), now.getMonth() + 1);

  const {
    transactions,
    categoryMap,
    primaryCurrency,
    recurringItems,
    budgetSummary,
    loading,
    error,
    categoryTotals,
    momDeltas,
    merchantTotals,
    dailySpend,
    uncategorizedCount,
    quickStats,
    incomePanelTxs,
    sortedSpendTxs,
    peakDayPanelTxs,
    maxCatSpend,
    handleCategoryUpdated,
  } = useDashboardData(token, selectedYear, selectedMonth);

  if (!token) {
    return <NoTokenPrompt />;
  }

  return (
    <div className="mx-auto max-w-6xl pt-6 pb-10">
      <MonthSelector
        year={selectedYear}
        month={selectedMonth}
        onPrev={onPrev}
        onNext={onNext}
      />

      {/* Uncategorized Banner */}
      {!loading && uncategorizedCount > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30">
          <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="flex-1 text-sm text-amber-800 dark:text-amber-300">
            <span className="font-semibold">
              {uncategorizedCount} uncategorized transaction
              {uncategorizedCount !== 1 ? "s" : ""}
            </span>
            {" — "}
            <Link
              href="/transactions"
              className="underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200"
            >
              assign categories →
            </Link>
          </p>
        </div>
      )}

      {/*
        key={`${selectedYear}-${selectedMonth}`} causes React to fully unmount
        and remount QuickStatsPanel whenever the month changes. This resets the
        openPanel state inside it back to null automatically — no extra code
        needed in the parent.
      */}
      <QuickStatsPanel
        key={`${selectedYear}-${selectedMonth}`}
        quickStats={quickStats}
        primaryCurrency={primaryCurrency}
        incomePanelTxs={incomePanelTxs}
        sortedSpendTxs={sortedSpendTxs}
        peakDayPanelTxs={peakDayPanelTxs}
        categoryMap={categoryMap}
        selectedMonth={selectedMonth}
        loading={loading}
      />

      {/* Net Cash Flow + Daily Chart row */}
      {!loading && quickStats && (
        <div className="mb-4 grid grid-cols-2 gap-4">
          <NetCashFlowBar
            income={quickStats.totalIncome}
            spend={quickStats.totalSpend}
            primaryCurrency={primaryCurrency}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Daily Spend — {MONTH_NAMES[selectedMonth - 1]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DailySpendChart
                data={dailySpend}
                primaryCurrency={primaryCurrency}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category drill-down + Top Merchants */}
      <div className="mb-4 grid grid-cols-2 items-start gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Spend by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : categoryTotals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No spending data found.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {categoryTotals.map((cat, i) => (
                  <CategoryRow
                    key={cat.id}
                    cat={cat}
                    color={CAT_COLORS[i % CAT_COLORS.length]}
                    maxSpend={maxCatSpend}
                    delta={momDeltas.get(cat.id)}
                    primaryCurrency={primaryCurrency}
                    transactions={transactions}
                    categoryMap={categoryMap}
                    token={token}
                    onCategoryUpdated={handleCategoryUpdated}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <TopMerchantsCard
          merchantTotals={merchantTotals}
          primaryCurrency={primaryCurrency}
          loading={loading}
        />

        <SubscriptionsCard
          items={recurringItems}
          primaryCurrency={primaryCurrency}
        />

        {budgetSummary && (
          <BudgetProgressCard
            summary={budgetSummary}
            categoryMap={categoryMap}
            primaryCurrency={primaryCurrency}
          />
        )}
      </div>
    </div>
  );
}
