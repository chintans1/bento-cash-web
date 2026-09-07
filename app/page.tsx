"use client";

import { Suspense } from "react";
import { monthKeyOf } from "@/lib/date-utils";
import { useToken } from "@/hooks/use-token";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { NoTokenPrompt } from "@/components/no-token-prompt";
import { useMonthNavigation } from "@/hooks/use-month-navigation";
import { MonthSelector } from "@/components/dashboard/month-selector";
import { UncategorizedBanner } from "@/components/dashboard/uncategorized-banner";
import { NetWorthCard } from "@/components/dashboard/net-worth-card";
import { QuickStatsPanel } from "@/components/dashboard/quick-stats-panel";
import { NetCashFlowBar } from "@/components/dashboard/net-cash-flow-bar";
import { SpendingTrendCard } from "@/components/dashboard/spending-trend-card";
import { SpendByCategoryCard } from "@/components/dashboard/spend-by-category-card";
import { TopMerchantsCard } from "@/components/dashboard/top-merchants-card";
import { BudgetProgressCard } from "@/components/dashboard/budget-progress-card";
import { UpcomingBillsCard } from "@/components/dashboard/upcoming-bills-card";
import { RecentTransactionsCard } from "@/components/dashboard/recent-transactions-card";
import { AnimatedCollapse } from "@/components/animated-collapse";

function HomePage() {
  const { isAuthenticated } = useToken();
  const {
    year: selectedYear,
    month: selectedMonth,
    onPrev,
    onNext,
    onToday,
    pending,
  } = useMonthNavigation();

  const {
    transactions,
    categoryMap,
    primaryCurrency,
    recurringItems,
    budgetSummary,
    netWorth,
    netWorthHistory,
    netWorthHistoryLoading,
    loading,
    refreshing,
    error,
    categoryTotals,
    momDeltas,
    merchantTotals,
    cumulativeSpend,
    prevMonthTotals,
    recentTransactions,
    uncategorizedCount,
    quickStats,
    incomePanelTxs,
    sortedSpendTxs,
    peakDayPanelTxs,
    maxCatSpend,
  } = useDashboardData(isAuthenticated, selectedYear, selectedMonth);

  const transactionsHref = `/transactions?month=${monthKeyOf(selectedYear, selectedMonth)}`;

  if (!isAuthenticated) {
    return <NoTokenPrompt />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-heading text-2xl font-bold">Overview</h1>
        <MonthSelector
          year={selectedYear}
          month={selectedMonth}
          onPrev={onPrev}
          onNext={onNext}
          onToday={onToday}
          refreshing={refreshing || pending}
          className="mb-0"
        />
      </div>

      <AnimatedCollapse open={!loading && uncategorizedCount > 0}>
        <UncategorizedBanner
          count={uncategorizedCount}
          href={`${transactionsHref}&category=-1`}
        />
      </AnimatedCollapse>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <NetWorthCard
            netWorth={netWorth}
            history={netWorthHistory}
            historyLoading={netWorthHistoryLoading}
            year={selectedYear}
            month={selectedMonth}
            primaryCurrency={primaryCurrency}
          />
        </div>

        {!loading && quickStats && (
          <NetCashFlowBar
            income={quickStats.totalIncome}
            spend={quickStats.totalSpend}
            previous={prevMonthTotals}
            year={selectedYear}
            month={selectedMonth}
            primaryCurrency={primaryCurrency}
          />
        )}
      </div>

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

      {/*
        Two explicit columns rather than one auto-flowing grid: the wide cards
        and the narrow ones have different heights, and letting the browser
        flow them into a single grid leaves gaps whenever a card is missing
        (no budgets configured, no recurring items).
      */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <SpendingTrendCard
            data={cumulativeSpend}
            year={selectedYear}
            month={selectedMonth}
            primaryCurrency={primaryCurrency}
            loading={loading}
          />

          <SpendByCategoryCard
            categoryTotals={categoryTotals}
            momDeltas={momDeltas}
            maxCatSpend={maxCatSpend}
            primaryCurrency={primaryCurrency}
            transactions={transactions}
            loading={loading}
            error={error}
          />

          <TopMerchantsCard
            transactionsHref={transactionsHref}
            merchantTotals={merchantTotals}
            primaryCurrency={primaryCurrency}
            loading={loading}
          />
        </div>

        <div className="flex flex-col gap-4">
          {budgetSummary && (
            <BudgetProgressCard
              summary={budgetSummary}
              categoryMap={categoryMap}
              primaryCurrency={primaryCurrency}
            />
          )}

          <UpcomingBillsCard
            items={recurringItems}
            primaryCurrency={primaryCurrency}
          />

          <RecentTransactionsCard
            transactionsHref={transactionsHref}
            transactions={recentTransactions}
            categoryMap={categoryMap}
            primaryCurrency={primaryCurrency}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  return (
    <Suspense>
      <HomePage />
    </Suspense>
  );
}
