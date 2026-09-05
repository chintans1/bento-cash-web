"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getBalanceHistory,
  getBudgetSummary,
  getRecurringItems,
  getTransactionsForMonth,
  type AlignedSummaryResponse,
  type BalanceHistoryAccount,
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
import { monthKeyOf, prevMonthOf } from "@/lib/date-utils";

/** How much of the net worth curve the hero shows. */
const NET_WORTH_MONTHS = 12;

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
  isAuthenticated: boolean,
  year: number,
  month: number
): DashboardData {
  /** One Date for the hook's lifetime — a fresh one each render would churn
   * every memo keyed on it. */
  const now = useMemo(() => new Date(), []);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prevTransactions, setPrevTransactions] = useState<Transaction[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [budgetSummary, setBudgetSummary] =
    useState<AlignedSummaryResponse | null>(null);
  /** null while the request is out; [] once it has resolved or failed. */
  const [balanceHistory, setBalanceHistory] = useState<
    BalanceHistoryAccount[] | null
  >(null);
  const {
    accounts,
    primaryCurrency,
    categoryMap,
    loading: appLoading,
  } = useAppData();
  /** The month currently on screen, and any failure, both tagged by month. */
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null);
  const [failure, setFailure] = useState<{
    month: string;
    message: string;
  } | null>(null);

  const monthKey = `${year}-${month}`;
  // Derived: we're loading whenever what's rendered isn't the month selected
  // and that month hasn't already failed. No flag to keep in sync.
  const isLoading =
    isAuthenticated && loadedMonth !== monthKey && failure?.month !== monthKey;
  const error = failure?.month === monthKey ? failure.message : null;

  // Re-fetch all transaction data whenever the auth state or selected month changes
  useEffect(() => {
    if (!isAuthenticated) return;

    const prev = prevMonthOf(year, month);
    // Guards against a slow response for a month the user has already left
    // overwriting the month they're now looking at.
    let cancelled = false;

    Promise.all([
      getTransactionsForMonth(year, month),
      getTransactionsForMonth(prev.year, prev.month),
    ])
      .then(([txRes, prevTxRes]) => {
        if (cancelled) return;
        setTransactions(txRes.transactions);
        setPrevTransactions(prevTxRes.transactions);
        setLoadedMonth(monthKey);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFailure({
          month: monthKey,
          message: err instanceof Error ? err.message : "Something went wrong",
        });
      });

    // Secondary data: renders after the main content, failures stay quiet
    // because the cards simply don't render without them.
    getRecurringItems()
      .then((items) => {
        if (!cancelled) setRecurringItems(items);
      })
      .catch(() => {});
    getBudgetSummary(year, month)
      .then((summary) => {
        if (!cancelled) setBudgetSummary(summary);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, year, month, monthKey]);

  /**
   * All of LM's balance history, fetched once — it doesn't depend on the month
   * on screen, so stepping through months reads from what's already here.
   * A failure resolves to an empty series and the hero just drops its chart.
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    getBalanceHistory()
      .then((history) => {
        if (!cancelled) setBalanceHistory(history);
      })
      .catch(() => {
        if (!cancelled) setBalanceHistory([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

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
    () => computeMoMDeltas(categoryTotals, prevCategoryTotals),
    [categoryTotals, prevCategoryTotals]
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
    netWorthHistoryLoading: isAuthenticated && balanceHistory === null,
    loading: (isLoading || appLoading) && transactions.length === 0,
    refreshing: isLoading && transactions.length > 0,
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
