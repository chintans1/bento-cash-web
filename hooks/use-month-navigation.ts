"use client";

import { useState } from "react";
import { prevMonthOf, nextMonthOf } from "@/lib/date-utils";

type MonthNavigation = {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
};

export function useMonthNavigation(
  initialYear: number,
  initialMonth: number
): MonthNavigation {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

  return {
    year,
    month,
    onPrev: () => {
      const p = prevMonthOf(year, month);
      setYear(p.year);
      setMonth(p.month);
    },
    onNext: () => {
      const n = nextMonthOf(year, month);
      setYear(n.year);
      setMonth(n.month);
    },
  };
}
