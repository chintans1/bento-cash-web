"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { monthKeyOf, prevMonthOf, nextMonthOf } from "@/lib/date-utils";

/** Keep the selected month in the URL so drill-downs and browser history agree. */
export function useMonthNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const now = new Date();
  const currentKey = monthKeyOf(now.getFullYear(), now.getMonth() + 1);
  const requested = searchParams.get("month");
  const key =
    requested &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(requested) &&
    requested <= currentKey
      ? requested
      : currentKey;
  const [year, month] = key.split("-").map(Number);

  const navigate = useCallback(
    (next: { year: number; month: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", monthKeyOf(next.year, next.month));
      startTransition(() =>
        router.push(`${pathname}?${params}`, { scroll: false })
      );
    },
    [pathname, router, searchParams]
  );

  const onPrev = useCallback(
    () => navigate(prevMonthOf(year, month)),
    [navigate, year, month]
  );
  const onNext = useCallback(() => {
    if (key < currentKey) navigate(nextMonthOf(year, month));
  }, [navigate, year, month, key, currentKey]);
  const onToday = () =>
    navigate({ year: now.getFullYear(), month: now.getMonth() + 1 });

  return { year, month, pending, onPrev, onNext, onToday };
}
