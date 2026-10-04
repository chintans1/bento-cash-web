"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getBudgetSummary,
  getTransactionsForMonth,
  type AlignedSummaryResponse,
  type RecurringItem,
  type Transaction,
} from "@/lib/lunchmoney/client";
import {
  computeCategoryTotals,
  computeCumulativeSpendComparison,
  computeDailySpend,
  computeMerchantTotals,
  computeMonthTotals,
  computeMoMDeltas,
  computeQuickStats,
  countUncategorized,
  getPeakDayTxs,
  getRecentTransactions,
  getSortedIncomeTxs,
  getSortedSpendTxs,
  type CategoryTotal,
  type CumulativeSpendPoint,
  type MerchantTotal,
  type MonthTotals,
  type MoMDelta,
  type QuickStats,
} from "@/lib/lunchmoney/analytics";
import { type CategoryInfo } from "@/lib/lunchmoney/categories";
import { computeNetWorth, type NetWorth } from "@/lib/account-utils";
import {
  computeNetWorthHistory,
  trailingMonths,
  type NetWorthPoint,
} from "@/lib/lunchmoney/net-worth-history";
import { useAppData } from "@/hooks/use-app-data";
import { useBalanceHistory } from "@/hooks/use-balance-history";
import { monthKeyOf, prevMonthOf } from "@/lib/date-utils";

/** How much of the net worth curve the hero shows. */
const NET_WORTH_MONTHS = 12;
const EMPTY_TRANSACTIONS: Transaction[] = [];

export type DashboardData = {
  // Raw data
  transactions: Transaction[];
  categoryMap: Map<number, CategoryInfo>;
  primaryCurrency: string;
  recurringItems: RecurringItem[];
  budgetSummary: AlignedSummaryResponse | null;
  /** null until the accounts request resolves — it loads after the main render. */
  netWorth: NetWorth | null;
  /** Month-end net worth for the year ending at the selected month. */
  netWorthHistory: NetWorthPoint[];
  /** True while the balance history request is still out. */
  netWorthHistoryLoading: boolean;
  /** True only when there's nothing to show yet. A month change keeps the previous month on screen instead of flashing skeletons. */
  loading: boolean;
  /** True while a month change is in flight over already-rendered content. */
  refreshing: boolean;
  comparisonLoading: boolean;
  comparisonUnavailable: boolean;
  error: string | null;

  // Derived / computed values
  categoryTotals: CategoryTotal[];
  momDeltas: Map<number, MoMDelta>;
  merchantTotals: MerchantTotal[];
  cumulativeSpend: CumulativeSpendPoint[];
  prevMonthTotals: MonthTotals;
  recentTransactions: Transaction[];
  uncategorizedCount: number;
  quickStats: QuickStats | null;
  incomePanelTxs: Transaction[];
  sortedSpendTxs: Transaction[];
  peakDayPanelTxs: Transaction[];
  maxCatSpend: number;
};

export function useDashboardData(
  session: string | null,
  year: number,
  month: number
): DashboardData {
  /** One Date for the hook's lifetime — a fresh one each render would churn
   * every memo keyed on it. */
  const now = useMemo(() => new Date(), []);

  const [currentResult, setCurrentResult] = useState<{
    key: string;
    transactions: Transaction[];
  } | null>(null);
  const [previousResult, setPreviousResult] = useState<{
    key: string;
    transactions: Transaction[];
  } | null>(null);
  const [comparisonFailedKey, setComparisonFailedKey] = useState<string | null>(
    null
  );
  const [budgetResult, setBudgetResult] = useState<{
    key: string;
    summary: AlignedSummaryResponse;
  } | null>(null);
  const balanceHistory = useBalanceHistory(session);
  const {
    accounts,
    primaryCurrency,
    categoryMap,
    recurringItems,
    loading: appLoading,
  } = useAppData();
  /** Results and failures are tagged so a month change never displays old data. */
  const [failure, setFailure] = useState<{
    month: string;
    message: string;
  } | null>(null);

  const monthKey = session ? `${session}:${year}-${month}` : `${year}-${month}`;
  const previous = prevMonthOf(year, month);
  const previousKey = session
    ? `${session}:${previous.year}-${previous.month}`
    : `${previous.year}-${previous.month}`;
  const transactions =
    currentResult?.key === monthKey
      ? currentResult.transactions
      : EMPTY_TRANSACTIONS;
  const prevTransactions =
    previousResult?.key === previousKey
      ? previousResult.transactions
      : EMPTY_TRANSACTIONS;
  const comparisonReady = previousResult?.key === previousKey;
  const comparisonUnavailable = comparisonFailedKey === previousKey;
  const comparisonLoading = !comparisonReady && !comparisonUnavailable;
  const budgetSummary =
    budgetResult?.key === monthKey ? budgetResult.summary : null;
  const isLoading =
    session !== null &&
    currentResult?.key !== monthKey &&
    failure?.month !== monthKey;
  const error = failure?.month === monthKey ? failure.message : null;

  // Re-fetch all transaction data whenever the auth state or selected month changes
  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    getTransactionsForMonth(year, month)
      .then((result) => {
        if (cancelled) return;
        setCurrentResult({ key: monthKey, transactions: result.transactions });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFailure({
          month: monthKey,
          message: err instanceof Error ? err.message : "Something went wrong",
        });
      });

    // Comparisons never block the current month. The key prevents a prior
    // month comparison from being paired with the newly selected month.
    getTransactionsForMonth(previous.year, previous.month)
      .then((result) => {
        if (!cancelled) {
          setPreviousResult({
            key: previousKey,
            transactions: result.transactions,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setComparisonFailedKey(previousKey);
      });
    getBudgetSummary(year, month)
      .then((summary) => {
        if (!cancelled) setBudgetResult({ key: monthKey, summary });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    session,
    year,
    month,
    monthKey,
    previous.year,
    previous.month,
    previousKey,
  ]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const categoryTotals = useMemo(
    () => computeCategoryTotals(transactions, categoryMap),
    [transactions, categoryMap]
  );

  const prevCategoryTotals = useMemo(
    () => computeCategoryTotals(prevTransactions, categoryMap, 50),
    [prevTransactions, categoryMap]
  );

  const momDeltas = useMemo(
    () =>
      !comparisonReady
        ? new Map<number, MoMDelta>()
        : computeMoMDeltas(categoryTotals, prevCategoryTotals),
    [categoryTotals, prevCategoryTotals, comparisonReady]
  );

  const merchantTotals = useMemo(
    () => computeMerchantTotals(transactions, categoryMap, 8),
    [transactions, categoryMap]
  );

  const dailySpend = useMemo(
    () => computeDailySpend(transactions, categoryMap, year, month),
    [transactions, categoryMap, year, month]
  );

  /**
   * null only while the request is out, so the hero can hold its shape. Keyed
   * on the request rather than on `accounts.length`, or someone with no
   * accounts at all would sit under a loading skeleton forever.
   */
  const netWorth = useMemo(
    () => (appLoading ? null : computeNetWorth(accounts)),
    [accounts, appLoading]
  );

  const netWorthHistory = useMemo(
    () =>
      balanceHistory
        ? trailingMonths(
            computeNetWorthHistory(balanceHistory, accounts),
            monthKeyOf(year, month),
            NET_WORTH_MONTHS
          )
        : [],
    [balanceHistory, accounts, year, month]
  );

  const cumulativeSpend = useMemo(
    () =>
      computeCumulativeSpendComparison(
        transactions,
        prevTransactions,
        categoryMap,
        year,
        month,
        now
      ),
    [transactions, prevTransactions, categoryMap, year, month, now]
  );

  /** Previous month's income and spend, for the cash flow card's comparison. */
  const prevMonthTotals = useMemo(
    () => computeMonthTotals(prevTransactions, categoryMap),
    [prevTransactions, categoryMap]
  );

  const recentTransactions = useMemo(
    () => getRecentTransactions(transactions),
    [transactions]
  );

  const uncategorizedCount = useMemo(
    () => countUncategorized(transactions),
    [transactions]
  );

  const quickStats = useMemo(
    () =>
      computeQuickStats(
        transactions,
        categoryMap,
        year,
        month,
        dailySpend,
        now
      ),
    [transactions, categoryMap, year, month, dailySpend, now]
  );

  const incomePanelTxs = useMemo(
    () => getSortedIncomeTxs(transactions, categoryMap),
    [transactions, categoryMap]
  );

  const sortedSpendTxs = useMemo(
    () => getSortedSpendTxs(transactions, categoryMap),
    [transactions, categoryMap]
  );

  const peakDayPanelTxs = useMemo(
    () =>
      quickStats?.peakDay
        ? getPeakDayTxs(sortedSpendTxs, quickStats.peakDay)
        : [],
    [sortedSpendTxs, quickStats]
  );

  const maxCatSpend = categoryTotals[0]?.spend ?? 0;

  return {
    transactions,
    categoryMap,
    primaryCurrency,
    recurringItems,
    budgetSummary,
    netWorth,
    netWorthHistory,
    netWorthHistoryLoading: session !== null && balanceHistory === null,
    loading: isLoading || appLoading,
    refreshing: isLoading && currentResult !== null,
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
  };
}
