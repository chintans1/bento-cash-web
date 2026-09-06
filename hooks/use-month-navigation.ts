"use client";

import { useCallback, useState, useTransition } from "react";
import { prevMonthOf, nextMonthOf } from "@/lib/date-utils";

type MonthNavigation = {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  /** True while React is rendering the new month in the background. */
  pending: boolean;
};

/**
 * Owns the selected month, starting at the current one.
 *
 * The month change runs inside a transition: re-rendering a month's worth of
 * cards and charts is a ~170ms job, and as a blocking update it froze the UI
 * between the click and the new data. As a transition React can interrupt that
 * work, so the arrow stays responsive and repeated presses land immediately.
 */
export function useMonthNavigation(): MonthNavigation {
  const [{ year, month }, setSelected] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [pending, startTransition] = useTransition();

  // Stable identities: the transactions page binds these to a window keydown
  // listener, and new closures each render would re-subscribe it every time.
  const onPrev = useCallback(() => {
    startTransition(() =>
      setSelected((current) => prevMonthOf(current.year, current.month))
    );
  }, []);

  const onNext = useCallback(() => {
    startTransition(() =>
      setSelected((current) => nextMonthOf(current.year, current.month))
    );
  }, []);

  return { year, month, pending, onPrev, onNext };
}
