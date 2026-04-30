import { cn } from "@/lib/utils";
import type { MoMDelta } from "@/lib/lunchmoney/analytics";
import { Badge } from "@/components/ui/badge";

export function MoMBadge({ delta }: { delta: MoMDelta | undefined }) {
  if (!delta || delta.pct === null || delta.pct === 0) return null;
  const pct = delta.pct;
  const isUp = pct > 0;
  const label = `${isUp ? "+" : ""}${pct.toFixed(0)}%`;
  return (
    <Badge
      className={cn(
        "ml-2 text-[10px] tabular-nums",
        isUp
          ? "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400"
          : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
      )}
    >
      {label} vs last mo.
    </Badge>
  );
}
