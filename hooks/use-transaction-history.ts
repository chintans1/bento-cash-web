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
  session: string | null,
  attempt = 0
): History {
  const [history, setHistory] = useState<(History & { key: string }) | null>(
    null
  );
  const key = `${session}:${count}:${attempt}`;

  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    async function load() {
      const periods = lastFullMonths(count);
      const months: Transaction[][] = [];
      for (let end = periods.length; end > 0 && !cancelled; end -= 6) {
        const chunk = await Promise.all(
          periods
            .slice(Math.max(0, end - 6), end)
            .map(({ year, month }) =>
              getTransactionsForMonth(year, month).then((r) => r.transactions)
            )
        );
        months.unshift(...chunk);
      }
      return months;
    }

    void load()
      .then((months) => {
        if (!cancelled) setHistory({ key, months, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setHistory({
          key,
          months: null,
          error:
            err instanceof Error ? err.message : "Could not load transactions",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [count, key, session]);

  return history?.key === key ? history : PENDING;
}
