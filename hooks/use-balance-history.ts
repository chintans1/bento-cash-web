"use client";

import { useEffect, useState } from "react";
import {
  getBalanceHistory,
  type BalanceHistoryAccount,
} from "@/lib/lunchmoney/client";

/** All balance snapshots, or null while the request is pending. */
export function useBalanceHistory(dataScopeKey: string | null) {
  const [history, setHistory] = useState<BalanceHistoryAccount[] | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataScopeKey) return;
    let cancelled = false;

    getBalanceHistory()
      .then((result) => {
        if (!cancelled) setHistory(result);
      })
      .catch(() => {
        if (!cancelled) {
          setHistory([]);
          setError("Could not load balance history. Reload to try again.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dataScopeKey]);

  return { history, error };
}
