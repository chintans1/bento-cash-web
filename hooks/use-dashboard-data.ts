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
  countUncategorized,
  filterSpendTransactions,
  type CategoryTotal,
  type DailySpend,
  type MerchantTotal,
  type MoMDelta,
} from "@/lib/lunchmoney/analytics";
import { type CategoryInfo } from "@/lib/lunchmoney/categories";
import { prevMonthOf } from "@/lib/date-utils";

export type QuickStats = {
  totalSpend: number;
  totalIncome: number;
  avgSpendPerDay: number;
  peakDay: string;
  peakAmount: number;
};

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

  // Actions
  handleCategoryUpdated: (txId: number, newCatId: number | null) => void;
};

export function useDashboardData(
  token: string | null,
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

  // Fetch the user's primary currency once when the token changes
  useEffect(() => {
    if (!token) return;
    getMe(token)
      .then((user) => setPrimaryCurrency(user.primary_currency))
      .catch(() => {});
  }, [token]);

  // Re-fetch all transaction data whenever the token or selected month changes
  useEffect(() => {
    if (!token) return;
    setFetchStatus({ loading: true, error: null });

    const prev = prevMonthOf(year, month);

    // Fetch current month, previous month, and categories in parallel
    Promise.all([
      getTransactionsForMonth(token, year, month),
      getTransactionsForMonth(token, prev.year, prev.month),
      getCategories(token),
    ])
      .then(([txRes, prevTxRes, catRes]) => {
        setTransactions(txRes.transactions);
        setPrevTransactions(prevTxRes.transactions);
        setCategoryMap(buildCategoryMap(catRes));
        setFetchStatus({ loading: false, error: null });
      })
      .catch((err) => {
        setFetchStatus({
          loading: false,
          error: err instanceof Error ? err.message : "Something went wrong",
        });
      });

    // These are non-critical — load after the main render, silently ignore errors
    getRecurringItems(token).then(setRecurringItems).catch(() => {});
    getBudgetSummary(token, year, month).then(setBudgetSummary).catch(() => {});
  }, [token, year, month]);

  // ── Derived data ────────────────────────────────────────────────────────────
  // useMemo means "only recompute when the listed dependencies change". Without
  // it, these expensive calculations would re-run on every render.

  const categoryTotals = useMemo(
    () => computeCategoryTotals(transactions, categoryMap),
    [transactions, categoryMap]
  );

  const prevCategoryTotals = useMemo(
    () => computeCategoryTotals(prevTransactions, categoryMap),
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
    () => countUncategorized(transactions, categoryMap),
    [transactions, categoryMap]
  );

  const quickStats = useMemo((): QuickStats | null => {
    if (transactions.length === 0) return null;

    const expenses = filterSpendTransactions(transactions, categoryMap);
    const totalSpend = expenses.reduce(
      (sum, tx) => sum + parseFloat(tx.amount),
      0
    );
    const totalIncome = transactions
      .filter((tx) => parseFloat(tx.amount) < 0)
      .reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0);

    const daysInMonth = new Date(year, month, 0).getDate();
    const isCurrentMonth =
      year === now.getFullYear() && month === now.getMonth() + 1;
    const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth;
    const avgSpendPerDay = daysElapsed > 0 ? totalSpend / daysElapsed : 0;

    const peak = dailySpend.reduce(
      (max, d) => (d.amount > max.amount ? d : max),
      { date: "", amount: 0 }
    );

    return {
      totalSpend,
      totalIncome,
      avgSpendPerDay,
      peakDay: peak.date,
      peakAmount: peak.amount,
    };
  }, [transactions, categoryMap, year, month, now, dailySpend]);

  const incomePanelTxs = useMemo(
    () =>
      transactions
        .filter((tx) => parseFloat(tx.amount) < 0)
        .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount)),
    [transactions]
  );

  const sortedSpendTxs = useMemo(
    () =>
      filterSpendTransactions(transactions, categoryMap).sort(
        (a, b) => parseFloat(b.amount) - parseFloat(a.amount)
      ),
    [transactions, categoryMap]
  );

  const peakDayPanelTxs = useMemo(
    () =>
      quickStats?.peakDay
        ? sortedSpendTxs.filter((tx) => tx.date === quickStats.peakDay)
        : [],
    [sortedSpendTxs, quickStats]
  );

  const maxCatSpend = categoryTotals[0]?.spend ?? 0;

  // Optimistic update: patch local state immediately after a category reassign,
  // so the UI reflects the change without needing a full re-fetch.
  function handleCategoryUpdated(txId: number, newCatId: number | null) {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === txId ? { ...tx, category_id: newCatId } : tx))
    );
  }

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
    handleCategoryUpdated,
  };
}
