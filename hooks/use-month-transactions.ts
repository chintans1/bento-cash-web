"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getTransactionsForMonth,
  updateTransaction,
  updateTransactions,
  type Transaction,
} from "@/lib/lunchmoney/client";
import {
  canonicalFieldsAtRevision,
  fieldsAtRevision,
  isInMonth,
  type TransactionPatch,
} from "@/lib/lunchmoney/transaction-state";

export type MonthTransactions = {
  transactions: Transaction[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  savingIds: Set<number>;
  errors: Map<number, string>;
  update: (id: number, patch: TransactionPatch) => Promise<boolean>;
  reviewMany: (ids: number[]) => Promise<boolean>;
};

export function useMonthTransactions(
  year: number,
  month: number,
  enabled: boolean
): MonthTransactions {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null);
  const [failure, setFailure] = useState<{
    month: string;
    message: string;
  } | null>(null);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<Map<number, string>>(new Map());
  const latest = useRef(transactions);
  const nextRevision = useRef(0);
  const fieldRevisions = useRef(new Map<string, number>());
  const pendingWrites = useRef(new Map<number, number>());

  const monthKey = `${year}-${month}`;
  const pending = loadedMonth !== monthKey && failure?.month !== monthKey;

  const updateLocal = useCallback(
    (change: (current: Transaction[]) => Transaction[]) => {
      const next = change(latest.current);
      latest.current = next;
      setTransactions(next);
    },
    []
  );

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    getTransactionsForMonth(year, month)
      .then((result) => {
        if (cancelled) return;
        latest.current = result.transactions;
        setTransactions(result.transactions);
        setLoadedMonth(monthKey);
        setFailure(null);
        setErrors(new Map());
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setFailure({
          month: monthKey,
          message:
            error instanceof Error ? error.message : "Something went wrong",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, year, month, monthKey]);

  const markSaving = useCallback((ids: number[], saving: boolean) => {
    ids.forEach((id) => {
      const count = (pendingWrites.current.get(id) ?? 0) + (saving ? 1 : -1);
      if (count > 0) pendingWrites.current.set(id, count);
      else pendingWrites.current.delete(id);
    });
    setSavingIds(new Set(pendingWrites.current.keys()));
  }, []);

  const update = useCallback(
    async (id: number, patch: TransactionPatch) => {
      const before = latest.current.find(
        (transaction) => transaction.id === id
      );
      if (!before || Object.keys(patch).length === 0) return true;

      const revision = ++nextRevision.current;
      Object.keys(patch).forEach((key) =>
        fieldRevisions.current.set(`${id}:${key}`, revision)
      );
      updateLocal((current) =>
        current.map((transaction) =>
          transaction.id === id ? { ...transaction, ...patch } : transaction
        )
      );
      setErrors((current) => {
        const next = new Map(current);
        next.delete(id);
        return next;
      });
      markSaving([id], true);

      try {
        const canonical = await updateTransaction(id, patch);
        const accepted = canonicalFieldsAtRevision(
          canonical,
          patch,
          fieldRevisions.current,
          id,
          revision
        );
        updateLocal((current) =>
          current
            .map((transaction) =>
              transaction.id === id
                ? { ...transaction, ...accepted }
                : transaction
            )
            .filter((transaction) => isInMonth(transaction.date, year, month))
        );
        return true;
      } catch (error) {
        const rollback = fieldsAtRevision(
          Object.fromEntries(
            Object.keys(patch).map((key) => [
              key,
              before[key as keyof Transaction],
            ])
          ) as TransactionPatch,
          fieldRevisions.current,
          id,
          revision
        );
        updateLocal((current) =>
          current.map((transaction) =>
            transaction.id === id
              ? { ...transaction, ...rollback }
              : transaction
          )
        );
        setErrors((current) =>
          new Map(current).set(
            id,
            error instanceof Error ? error.message : "Couldn't save changes"
          )
        );
        return false;
      } finally {
        markSaving([id], false);
      }
    },
    [markSaving, month, updateLocal, year]
  );

  const reviewMany = useCallback(
    async (ids: number[]) => {
      const before = new Map(
        latest.current
          .filter((transaction) => ids.includes(transaction.id))
          .map((transaction) => [transaction.id, transaction.status])
      );
      const revision = ++nextRevision.current;
      ids.forEach((id) => fieldRevisions.current.set(`${id}:status`, revision));
      updateLocal((current) =>
        current.map((transaction) =>
          ids.includes(transaction.id)
            ? { ...transaction, status: "reviewed" }
            : transaction
        )
      );
      markSaving(ids, true);

      try {
        await updateTransactions(ids.map((id) => ({ id, status: "reviewed" })));
        return true;
      } catch (error) {
        updateLocal((current) =>
          current.map((transaction) => {
            const status = before.get(transaction.id);
            return status !== undefined &&
              fieldRevisions.current.get(`${transaction.id}:status`) ===
                revision
              ? { ...transaction, status }
              : transaction;
          })
        );
        setErrors((current) => {
          const next = new Map(current);
          ids.forEach((id) =>
            next.set(
              id,
              error instanceof Error ? error.message : "Couldn't mark reviewed"
            )
          );
          return next;
        });
        return false;
      } finally {
        markSaving(ids, false);
      }
    },
    [markSaving, updateLocal]
  );

  return {
    transactions,
    loading: pending && transactions.length === 0,
    refreshing: pending && transactions.length > 0,
    error: failure?.month === monthKey ? failure.message : null,
    savingIds,
    errors,
    update,
    reviewMany,
  };
}
