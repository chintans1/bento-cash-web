"use client";

import { useState, useTransition } from "react";
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
 * Owns the selected month.
 *
 * The month change runs inside a transition: re-rendering a month's worth of
 * cards and charts is a ~170ms job, and as a blocking update it froze the UI
 * between the click and the new data. As a transition React can interrupt that
 * work, so the arrow stays responsive and repeated presses land immediately.
 */
export function useMonthNavigation(
  initialYear: number,
  initialMonth: number
): MonthNavigation {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [pending, startTransition] = useTransition();

  return {
    year,
    month,
    pending,
    onPrev: () => {
      const p = prevMonthOf(year, month);
      startTransition(() => {
        setYear(p.year);
        setMonth(p.month);
      });
    },
    onNext: () => {
      const n = nextMonthOf(year, month);
      startTransition(() => {
        setYear(n.year);
        setMonth(n.month);
      });
    },
  };
}
