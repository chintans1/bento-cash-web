"use client";

import { useToken } from "@/hooks/use-token";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { NoTokenPrompt } from "@/components/no-token-prompt";
import { useMonthNavigation } from "@/hooks/use-month-navigation";
import { MonthSelector } from "@/components/dashboard/month-selector";
import { UncategorizedBanner } from "@/components/dashboard/uncategorized-banner";
import { QuickStatsPanel } from "@/components/dashboard/quick-stats-panel";
import { NetCashFlowBar } from "@/components/dashboard/net-cash-flow-bar";
import { DailySpendCard } from "@/components/dashboard/daily-spend-card";
import { SpendByCategoryCard } from "@/components/dashboard/spend-by-category-card";
import { TopMerchantsCard } from "@/components/dashboard/top-merchants-card";
import { BudgetProgressCard } from "@/components/dashboard/budget-progress-card";
import { SubscriptionsCard } from "@/components/dashboard/subscriptions-card";

export default function HomePage() {
  const { token } = useToken();
  const {
    year: selectedYear,
    month: selectedMonth,
    onPrev,
    onNext,
  } = useMonthNavigation(new Date().getFullYear(), new Date().getMonth() + 1);

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
  } = useDashboardData(token, selectedYear, selectedMonth);

  if (!token) {
    return <NoTokenPrompt />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6">
      <MonthSelector
        year={selectedYear}
        month={selectedMonth}
        onPrev={onPrev}
        onNext={onNext}
      />

      {!loading && <UncategorizedBanner count={uncategorizedCount} />}

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

      {!loading && quickStats && (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NetCashFlowBar
            income={quickStats.totalIncome}
            spend={quickStats.totalSpend}
            primaryCurrency={primaryCurrency}
          />
          <DailySpendCard
            data={dailySpend}
            month={selectedMonth}
            primaryCurrency={primaryCurrency}
          />
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
        <SpendByCategoryCard
          categoryTotals={categoryTotals}
          momDeltas={momDeltas}
          maxCatSpend={maxCatSpend}
          primaryCurrency={primaryCurrency}
          transactions={transactions}
          categoryMap={categoryMap}
          loading={loading}
          error={error}
        />

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
