"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "investable_months";
const DEFAULT_MONTHS = 3;

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  // The storage event only fires in *other* tabs; same-tab writes notify below.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readMonths(): number {
  const parsed = Number(localStorage.getItem(STORAGE_KEY));
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 24
    ? parsed
    : DEFAULT_MONTHS;
}

function setMonths(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 24) return;
  localStorage.setItem(STORAGE_KEY, String(value));
  listeners.forEach((listener) => listener());
}

/**
 * How many months of expenses savings should cover before cash counts as
 * investable. Read on both the settings and accounts pages, so the parsing,
 * the default and the storage key live here rather than being repeated.
 *
 * useSyncExternalStore keeps the two pages in agreement and gives SSR a
 * defined snapshot — reading localStorage during render would mismatch the
 * prerendered HTML.
 */
export function useInvestableMonths(): {
  months: number;
  setMonths: (value: number) => void;
} {
  const months = useSyncExternalStore(
    subscribe,
    readMonths,
    () => DEFAULT_MONTHS
  );
  return { months, setMonths };
}
