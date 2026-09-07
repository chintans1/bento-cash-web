"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MONTH_NAMES, isCurrentOrFutureMonth } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

/** The prev/next month navigation bar. */
export function MonthSelector({
  year,
  month,
  onPrev,
  onNext,
  onToday,
  refreshing,
  className,
}: {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  /** Shows a quiet spinner while the month's data is in flight. */
  refreshing?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex items-center justify-end gap-1", className)}>
      {!isCurrentOrFutureMonth(year, month) && (
        <Button variant="ghost" className="h-10" onClick={onToday}>
          This month
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="Previous month"
        onClick={onPrev}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span
        aria-live="polite"
        className="min-w-32 text-center text-sm font-medium tabular-nums"
      >
        {MONTH_NAMES[month - 1]} {year}
      </span>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="Next month"
        disabled={isCurrentOrFutureMonth(year, month)}
        onClick={onNext}
      >
        <ChevronRight className="size-4" />
      </Button>
      <Loader2
        aria-hidden={!refreshing}
        className={cn(
          "size-3.5 animate-spin text-bento-subtle transition-opacity",
          refreshing ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}
