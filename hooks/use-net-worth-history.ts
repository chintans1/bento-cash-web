"use client";

import { useEffect, useState } from "react";
import {
  getBalanceHistory,
  type BalanceHistoryAccount,
} from "@/lib/lunchmoney/client";

export function useNetWorthHistory(isAuthenticated: boolean) {
  const [history, setHistory] = useState<BalanceHistoryAccount[] | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
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
  }, [isAuthenticated]);

  return history;
}
