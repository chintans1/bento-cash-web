"use client";

import { useEffect, useRef, useState } from "react";
import { prevMonthOf, nextMonthOf, isCurrentOrFutureMonth } from "@/lib/date-utils";

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

  // Refs so the keydown handler always sees the latest values without re-registering
  const yearRef = useRef(year);
  const monthRef = useRef(month);
  yearRef.current = year;
  monthRef.current = month;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      if (e.key === "ArrowLeft") {
        const p = prevMonthOf(yearRef.current, monthRef.current);
        setYear(p.year);
        setMonth(p.month);
      } else if (e.key === "ArrowRight") {
        if (!isCurrentOrFutureMonth(yearRef.current, monthRef.current)) {
          const n = nextMonthOf(yearRef.current, monthRef.current);
          setYear(n.year);
          setMonth(n.month);
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

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
