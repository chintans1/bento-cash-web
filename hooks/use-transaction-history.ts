"use client";

import { useEffect, useState } from "react";
import {
  getTransactionsForMonth,
  type Transaction,
} from "@/lib/lunchmoney/client";
import { lastFullMonths } from "@/lib/date-utils";

type History = {
  /** One entry per month, oldest first; null while the requests are out. */
  months: Transaction[][] | null;
  error: string | null;
};

const PENDING: History = { months: null, error: null };

/**
 * The last `count` complete months of transactions, for the averages the
 * accounts and investments pages run on.
 *
 * Anchored to today rather than a selected month, so the fixed window is served
 * from the request cache instead of refetched per page.
 */
export function useTransactionHistory(
  count: number,
  enabled: boolean
): History {
  const [history, setHistory] = useState<History>(PENDING);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    Promise.all(
      lastFullMonths(count).map(({ year, month }) =>
        getTransactionsForMonth(year, month).then((r) => r.transactions)
      )
    )
      .then((months) => {
        if (!cancelled) setHistory({ months, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setHistory({
          months: null,
          error:
            err instanceof Error ? err.message : "Could not load transactions",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [count, enabled]);

  return history;
}
