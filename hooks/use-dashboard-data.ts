"use client";

/**
 * useDashboardData
 *
 * A custom hook is just a plain function whose name starts with "use". React
 * lets you call other hooks (useState, useEffect, useMemo) inside it. By
 * putting all the data-fetching and number-crunching here, the page component
 * itself only needs to call one function and get back everything it needs —
 * no clutter.
 */

import { useEffect, useMemo, useState } from "react";
import {
  getBudgetSummary,
  getCategories,
  getMe,
  getRecurringItems,
  getTransactionsForMonth,
  type AlignedSummaryResponse,
  type RecurringItem,
  type Transaction,
} from "@/lib/lunchmoney/client";
import {
  buildCategoryMap,
  computeCategoryTotals,
  computeDailySpend,
  computeMerchantTotals,
  computeMoMDeltas,
  computeQuickStats,
  countUncategorized,
  getPeakDayTxs,
  getSortedIncomeTxs,
  getSortedSpendTxs,
  type CategoryTotal,
  type DailySpend,
  type MerchantTotal,
  type MoMDelta,
  type QuickStats,
} from "@/lib/lunchmoney/analytics";
import { type CategoryInfo } from "@/lib/lunchmoney/categories";
import { prevMonthOf } from "@/lib/date-utils";

export type DashboardData = {
  // Raw data
  transactions: Transaction[];
  categoryMap: Map<number, CategoryInfo>;
  primaryCurrency: string;
  recurringItems: RecurringItem[];
  budgetSummary: AlignedSummaryResponse | null;
  loading: boolean;
  error: string | null;

  // Derived / computed values
  categoryTotals: CategoryTotal[];
  momDeltas: Map<number, MoMDelta>;
  merchantTotals: MerchantTotal[];
  dailySpend: DailySpend[];
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
  // "now" is only computed once (empty dependency array = run once on mount)
  const now = useMemo(() => new Date(), []);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prevTransactions, setPrevTransactions] = useState<Transaction[]>([]);
  const [categoryMap, setCategoryMap] = useState<Map<number, CategoryInfo>>(
    new Map()
  );
  const [primaryCurrency, setPrimaryCurrency] = useState("usd");
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [budgetSummary, setBudgetSummary] =
    useState<AlignedSummaryResponse | null>(null);
  const [{ loading, error }, setFetchStatus] = useState<{
    loading: boolean;
    error: string | null;
  }>({ loading: false, error: null });

  // Fetch the user's primary currency once when auth state changes
  useEffect(() => {
    if (!isAuthenticated) return;
    getMe()
      .then((user) => setPrimaryCurrency(user.primary_currency))
      .catch(() => {});
  }, [isAuthenticated]);

  // Re-fetch all transaction data whenever the auth state or selected month changes
  useEffect(() => {
    if (!isAuthenticated) return;
    const prev = prevMonthOf(year, month);

    async function load() {
      setFetchStatus({ loading: true, error: null });
      try {
        const [txRes, prevTxRes, catRes] = await Promise.all([
          getTransactionsForMonth(year, month),
          getTransactionsForMonth(prev.year, prev.month),
          getCategories(),
        ]);
        setTransactions(txRes.transactions);
        setPrevTransactions(prevTxRes.transactions);
        setCategoryMap(buildCategoryMap(catRes));
        setFetchStatus({ loading: false, error: null });
      } catch (err) {
        setFetchStatus({
          loading: false,
          error: err instanceof Error ? err.message : "Something went wrong",
        });
      }
    }

    load();

    // These are non-critical — load after the main render, silently ignore errors
    getRecurringItems()
      .then(setRecurringItems)
      .catch(() => {});
    getBudgetSummary(year, month)
      .then(setBudgetSummary)
      .catch(() => {});
  }, [isAuthenticated, year, month]);

  // ── Derived data ────────────────────────────────────────────────────────────
  // useMemo means "only recompute when the listed dependencies change". Without
  // it, these expensive calculations would re-run on every render.

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
  };
}
