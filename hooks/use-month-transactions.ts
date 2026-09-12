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

const EMPTY_TRANSACTION_IDS = new Set<number>();
const EMPTY_TRANSACTION_ERRORS = new Map<number, string>();

export function useMonthTransactions(
  year: number,
  month: number,
  session: string | null
): MonthTransactions {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [failure, setFailure] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState<{
    key: string;
    ids: Set<number>;
  } | null>(null);
  const [saveErrors, setSaveErrors] = useState<{
    key: string;
    values: Map<number, string>;
  } | null>(null);
  const latest = useRef(transactions);
  const nextRevision = useRef(0);
  const fieldRevisions = useRef(new Map<string, number>());
  const pendingWrites = useRef(new Map<string, Map<number, number>>());

  const monthKey = `${year}-${month}`;
  const requestKey = session === null ? null : `${session}:${monthKey}`;
  const activeRequestKey = useRef(requestKey);
  activeRequestKey.current = requestKey;
  const pending =
    requestKey !== null &&
    loadedKey !== requestKey &&
    failure?.key !== requestKey;
  const savingIds =
    saving?.key === requestKey ? saving.ids : EMPTY_TRANSACTION_IDS;
  const errors =
    saveErrors?.key === requestKey
      ? saveErrors.values
      : EMPTY_TRANSACTION_ERRORS;

  const updateLocal = useCallback(
    (change: (current: Transaction[]) => Transaction[]) => {
      const next = change(latest.current);
      latest.current = next;
      setTransactions(next);
    },
    []
  );

  useEffect(() => {
    if (requestKey === null) return;
    let cancelled = false;

    getTransactionsForMonth(year, month)
      .then((result) => {
        if (cancelled) return;
        latest.current = result.transactions;
        setTransactions(result.transactions);
        setLoadedKey(requestKey);
        setFailure(null);
        setSaveErrors({ key: requestKey, values: new Map() });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setFailure({
          key: requestKey,
          message:
            error instanceof Error ? error.message : "Something went wrong",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, year, month]);

  const markSaving = useCallback(
    (key: string, ids: number[], value: boolean) => {
      const writes =
        pendingWrites.current.get(key) ?? new Map<number, number>();
      ids.forEach((id) => {
        const count = (writes.get(id) ?? 0) + (value ? 1 : -1);
        if (count > 0) writes.set(id, count);
        else writes.delete(id);
      });
      if (writes.size > 0) pendingWrites.current.set(key, writes);
      else pendingWrites.current.delete(key);

      if (activeRequestKey.current === key) {
        setSaving({ key, ids: new Set(writes.keys()) });
      }
    },
    []
  );

  const update = useCallback(
    async (id: number, patch: TransactionPatch) => {
      const key = activeRequestKey.current;
      const before = latest.current.find(
        (transaction) => transaction.id === id
      );
      if (!key || loadedKey !== key || !before) return false;
      if (Object.keys(patch).length === 0) return true;

      const revision = ++nextRevision.current;
      Object.keys(patch).forEach((key) =>
        fieldRevisions.current.set(`${id}:${key}`, revision)
      );
      updateLocal((current) =>
        current.map((transaction) =>
          transaction.id === id ? { ...transaction, ...patch } : transaction
        )
      );
      setSaveErrors((current) => {
        const next = new Map(current?.key === key ? current.values : []);
        next.delete(id);
        return { key, values: next };
      });
      markSaving(key, [id], true);

      try {
        const canonical = await updateTransaction(id, patch);
        const accepted = canonicalFieldsAtRevision(
          canonical,
          patch,
          fieldRevisions.current,
          id,
          revision
        );
        if (activeRequestKey.current === key) {
          updateLocal((current) =>
            current
              .map((transaction) =>
                transaction.id === id
                  ? { ...transaction, ...accepted }
                  : transaction
              )
              .filter((transaction) => isInMonth(transaction.date, year, month))
          );
        }
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
        if (
          activeRequestKey.current === key &&
          Object.keys(rollback).length > 0
        ) {
          updateLocal((current) =>
            current.map((transaction) =>
              transaction.id === id
                ? { ...transaction, ...rollback }
                : transaction
            )
          );
          setSaveErrors((current) => {
            const next = new Map(current?.key === key ? current.values : []);
            next.set(
              id,
              error instanceof Error ? error.message : "Couldn't save changes"
            );
            return { key, values: next };
          });
        }
        return false;
      } finally {
        markSaving(key, [id], false);
      }
    },
    [loadedKey, markSaving, month, updateLocal, year]
  );

  const reviewMany = useCallback(
    async (ids: number[]) => {
      const key = activeRequestKey.current;
      if (!key || loadedKey !== key) return false;
      const requestedIds = new Set(ids);
      const before = new Map(
        latest.current
          .filter((transaction) => requestedIds.has(transaction.id))
          .map((transaction) => [transaction.id, transaction.status])
      );
      const transactionIds = [...before.keys()];
      if (transactionIds.length === 0) return true;

      const revision = ++nextRevision.current;
      transactionIds.forEach((id) =>
        fieldRevisions.current.set(`${id}:status`, revision)
      );
      updateLocal((current) =>
        current.map((transaction) =>
          requestedIds.has(transaction.id)
            ? { ...transaction, status: "reviewed" }
            : transaction
        )
      );
      markSaving(key, transactionIds, true);

      try {
        await updateTransactions(
          transactionIds.map((id) => ({ id, status: "reviewed" }))
        );
        return true;
      } catch (error) {
        const rollbackIds = transactionIds.filter(
          (id) => fieldRevisions.current.get(`${id}:status`) === revision
        );
        if (activeRequestKey.current === key && rollbackIds.length > 0) {
          const rollbackSet = new Set(rollbackIds);
          updateLocal((current) =>
            current.map((transaction) => {
              const status = before.get(transaction.id);
              return status !== undefined && rollbackSet.has(transaction.id)
                ? { ...transaction, status }
                : transaction;
            })
          );
          setSaveErrors((current) => {
            const next = new Map(current?.key === key ? current.values : []);
            rollbackIds.forEach((id) =>
              next.set(
                id,
                error instanceof Error
                  ? error.message
                  : "Couldn't mark reviewed"
              )
            );
            return { key, values: next };
          });
        }
        return false;
      } finally {
        markSaving(key, transactionIds, false);
      }
    },
    [loadedKey, markSaving, updateLocal]
  );

  return {
    transactions,
    loading: pending && transactions.length === 0,
    refreshing: pending && transactions.length > 0,
    error: failure?.key === requestKey ? failure.message : null,
    savingIds,
    errors,
    update,
    reviewMany,
  };
}
