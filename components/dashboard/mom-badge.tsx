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
      title="vs last month"
      className={cn(
        "shrink-0 text-[10px] tabular-nums",
        isUp
          ? "bg-bento-negative/15 text-bento-negative"
          : "bg-bento-positive/15 text-bento-positive"
      )}
    >
      {label}
    </Badge>
  );
}
