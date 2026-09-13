"use client";

import { useEffect, useState } from "react";
import {
  getBalanceHistory,
  type BalanceHistoryAccount,
} from "@/lib/lunchmoney/client";

/** All balance snapshots, or null while the request is pending. */
export function useBalanceHistory(enabled: boolean) {
  const [history, setHistory] = useState<BalanceHistoryAccount[] | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    getBalanceHistory()
      .then((result) => {
        if (!cancelled) setHistory(result);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return history;
}
