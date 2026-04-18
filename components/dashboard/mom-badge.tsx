import { cn } from "@/lib/utils";
import type { MoMDelta } from "@/lib/lunchmoney/analytics";

/**
 * A tiny pill badge that shows the month-over-month percentage change for a
 * category. Green = spent less, red = spent more.
 *
 * This component has no state and no side effects — it's a "pure" component:
 * same props in → same output every time. That makes it trivial to test and
 * reason about.
 */
export function MoMBadge({ delta }: { delta: MoMDelta | undefined }) {
  if (!delta || delta.pct === null) return null;
  const pct = delta.pct;
  const isUp = pct > 0;
  const label = `${isUp ? "+" : ""}${pct.toFixed(0)}%`;
  return (
    <span
      className={cn(
        "ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
        isUp
          ? "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400"
          : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
      )}
    >
      {label} vs last mo.
    </span>
  );
}
