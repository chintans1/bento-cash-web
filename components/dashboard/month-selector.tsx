"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { MONTH_NAMES, isCurrentOrFutureMonth } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

/**
 * The prev/next month navigation bar.
 *
 * This component owns no state — it just calls onPrev/onNext when clicked.
 * The parent (page.tsx) owns the actual year/month values. This pattern is
 * called "lifting state up": the component that needs to share state with
 * siblings keeps it, and passes callbacks down to children.
 */
export function MonthSelector({
  year,
  month,
  onPrev,
  onNext,
  className,
}: {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex items-center justify-end gap-1", className)}>
      <span className="hidden text-sm text-bento-subtle sm:inline">
        viewing for
      </span>
      <Button variant="ghost" size="icon-sm" onClick={onPrev}>
        <ChevronLeft className="size-4" />
      </Button>
      <div className="relative text-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={`${year}-${month}`}
            className="absolute inset-x-0 text-sm font-medium"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {MONTH_NAMES[month - 1]} {year}
          </motion.span>
        </AnimatePresence>
        {/* invisible placeholder holds the container width for the widest label */}
        <span className="invisible text-sm font-medium" aria-hidden="true">
          September 2025
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={isCurrentOrFutureMonth(year, month)}
        onClick={onNext}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
