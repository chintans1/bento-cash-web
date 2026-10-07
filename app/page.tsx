"use client";

import { Suspense } from "react";
import { monthKeyOf } from "@/lib/date-utils";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { ConnectionPrompt } from "@/components/connection-prompt";
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
import { Collapsible } from "@/components/collapsible";

function HomePage() {
  const { hasDataSource, dataScopeKey } = useAuth();
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
    netWorthHistoryError,
    loading,
    refreshing,
    comparisonLoading,
    comparisonUnavailable,
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
  } = useDashboardData(dataScopeKey, selectedYear, selectedMonth);

  const transactionsHref = `/transactions?month=${monthKeyOf(selectedYear, selectedMonth)}`;

  if (!hasDataSource) {
    return <ConnectionPrompt />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6">
      <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl font-bold text-balance">
            Overview
          </h1>
          <p className="mt-1 text-sm text-bento-subtle">
            Your money at a glance
          </p>
        </div>
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

      <Collapsible open={!loading && uncategorizedCount > 0}>
        <UncategorizedBanner
          count={uncategorizedCount}
          href={`${transactionsHref}&category=-1`}
        />
      </Collapsible>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <NetWorthCard
            netWorth={netWorth}
            history={netWorthHistory}
            historyLoading={netWorthHistoryLoading}
            historyError={netWorthHistoryError}
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
            comparisonLoading={comparisonLoading}
            comparisonUnavailable={comparisonUnavailable}
          />

          <SpendByCategoryCard
            transactionsHref={transactionsHref}
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
            recurringItems={recurringItems}
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
