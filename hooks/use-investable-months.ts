"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "investable_months";
const DEFAULT_MONTHS = 3;

/**
 * How many months of expenses savings should cover before cash counts as
 * investable. Read on both the settings and accounts pages, so the parsing,
 * the default and the storage key live here rather than being repeated.
 *
 * useSyncExternalStore keeps the two pages in agreement and gives SSR a
 * defined snapshot — reading localStorage during render would mismatch the
 * prerendered HTML.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readMonths(): number {
  const parsed = Number.parseInt(localStorage.getItem(STORAGE_KEY) ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MONTHS;
}

export function useInvestableMonths(): {
  months: number;
  setMonths: (value: number) => void;
} {
  const months = useSyncExternalStore(
    subscribe,
    readMonths,
    () => DEFAULT_MONTHS
  );

  const setMonths = useCallback((value: number) => {
    if (!Number.isFinite(value) || value <= 0) return;
    localStorage.setItem(STORAGE_KEY, String(value));
    listeners.forEach((listener) => listener());
  }, []);

  return { months, setMonths };
}
