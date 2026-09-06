"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getTransactionsForMonth,
  updateTransactionCategory,
  updateTransactionNotes,
  updateTransactionPayee,
  type Transaction,
} from "@/lib/lunchmoney/client";

export type MonthTransactions = {
  transactions: Transaction[];
  /** True only on a first load, when there are no rows to keep on screen. */
  loading: boolean;
  /** True while a month change is in flight over already-rendered rows. */
  refreshing: boolean;
  error: string | null;
  savingIds: Set<number>;
  /** The row whose last edit failed, if any. */
  failedId: number | null;
  setCategory: (txId: number, categoryId: number | null) => void;
  setPayee: (txId: number, payee: string) => void;
  setNotes: (txId: number, notes: string | null) => void;
};

/**
 * One month of transactions, with edits applied optimistically.
 *
 * Every edit updates local state immediately and persists after; a failure
 * rolls the row back to its previous values and flags it, so an edit is never
 * silently lost.
 */
export function useMonthTransactions(
  year: number,
  month: number,
  enabled: boolean
): MonthTransactions {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  /** The month currently on screen, and any failure, both tagged by month. */
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null);
  const [failure, setFailure] = useState<{
    month: string;
    message: string;
  } | null>(null);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [failedId, setFailedId] = useState<number | null>(null);

  const monthKey = `${year}-${month}`;
  // Derived: we're loading whenever what's rendered isn't the month selected
  // and that month hasn't already failed. No flag to keep in sync.
  const pending = loadedMonth !== monthKey && failure?.month !== monthKey;

  useEffect(() => {
    if (!enabled) return;

    // Guards against a slow response for a month the user has already left
    // overwriting the month they're now looking at.
    let cancelled = false;

    getTransactionsForMonth(year, month)
      .then((res) => {
        if (cancelled) return;
        setTransactions(res.transactions);
        setLoadedMonth(monthKey);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFailure({
          month: monthKey,
          message: err instanceof Error ? err.message : "Something went wrong",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, year, month, monthKey]);

  /** Mirrors `transactions` so `save` can read the pre-edit row without
      taking a dependency on it — the page passes its callbacks to memoized
      rows, where a new identity per edit would defeat the memo. */
  const latest = useRef(transactions);
  useEffect(() => {
    latest.current = transactions;
  }, [transactions]);

  const save = useCallback(
    (
      txId: number,
      patch: Partial<Transaction>,
      persist: () => Promise<void>
    ) => {
      const before = latest.current.find((t) => t.id === txId);
      if (!before) return;

      setFailedId(null);
      setSavingIds((prev) => new Set(prev).add(txId));
      setTransactions((prev) =>
        prev.map((t) => (t.id === txId ? { ...t, ...patch } : t))
      );

      persist()
        .catch(() => {
          setTransactions((prev) =>
            prev.map((t) => (t.id === txId ? before : t))
          );
          setFailedId(txId);
        })
        .finally(() => {
          setSavingIds((prev) => {
            const next = new Set(prev);
            next.delete(txId);
            return next;
          });
        });
    },
    []
  );

  const setCategory = useCallback(
    (txId: number, categoryId: number | null) =>
      save(txId, { category_id: categoryId }, () =>
        updateTransactionCategory(txId, categoryId)
      ),
    [save]
  );

  const setPayee = useCallback(
    (txId: number, payee: string) =>
      save(txId, { payee }, () => updateTransactionPayee(txId, payee)),
    [save]
  );

  const setNotes = useCallback(
    (txId: number, notes: string | null) => {
      // Closing the panel without having touched the notes costs no request.
      const current = latest.current.find((t) => t.id === txId);
      if ((current?.notes ?? "") === (notes ?? "")) return;
      save(txId, { notes }, () => updateTransactionNotes(txId, notes));
    },
    [save]
  );

  return {
    transactions,
    loading: pending && transactions.length === 0,
    refreshing: pending && transactions.length > 0,
    error: failure?.month === monthKey ? failure.message : null,
    savingIds,
    failedId,
    setCategory,
    setPayee,
    setNotes,
  };
}
