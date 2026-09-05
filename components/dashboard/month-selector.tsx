"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { MONTH_NAMES, isCurrentOrFutureMonth } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { DURATION, EASE } from "@/lib/motion";

/** The prev/next month navigation bar. */
export function MonthSelector({
  year,
  month,
  onPrev,
  onNext,
  refreshing,
  className,
}: {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  /** Shows a quiet spinner while the month's data is in flight. */
  refreshing?: boolean;
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
      {/*
        The type is set here, not on the children: the label is positioned off
        this box's static position, so if this div fell back to the inherited
        16px/1.5 strut its line box would sit lower than the label's own and the
        label would render a few pixels above the caption and chevrons.
      */}
      <div className="relative text-center text-sm leading-5 font-medium">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={`${year}-${month}`}
            className="absolute inset-x-0"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: DURATION.quick, ease: EASE }}
          >
            {MONTH_NAMES[month - 1]} {year}
          </motion.span>
        </AnimatePresence>
        {/* invisible placeholder holds the container width for the widest label */}
        <span className="invisible" aria-hidden="true">
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
