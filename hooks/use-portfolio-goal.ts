"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "portfolio_goal";

/**
 * The portfolio target, in the user's primary currency. 0 means unset, which
 * is how the card knows to invite one rather than show progress toward zero.
 *
 * Same shape as `useInvestableMonths`: localStorage behind
 * useSyncExternalStore, so SSR gets a defined snapshot instead of a value read
 * during render.
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

function readGoal(): number {
  const parsed = Number.parseFloat(localStorage.getItem(STORAGE_KEY) ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function usePortfolioGoal(): {
  goal: number;
  setGoal: (value: number) => void;
} {
  const goal = useSyncExternalStore(subscribe, readGoal, () => 0);

  const setGoal = useCallback((value: number) => {
    if (!Number.isFinite(value) || value <= 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, String(value));
    }
    listeners.forEach((listener) => listener());
  }, []);

  return { goal, setGoal };
}
