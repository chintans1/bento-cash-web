"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatShortDate } from "@/lib/format";
import type { DailySpend } from "@/lib/lunchmoney/analytics";

/**
 * Bar chart showing one bar per day in the selected month.
 *
 * "use client" is needed here because this component uses useState to track
 * which bar the user is hovering over. State only works in client components.
 */
export function DailySpendChart({
  data,
  primaryCurrency,
}: {
  data: DailySpend[];
  primaryCurrency: string;
}) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  const [hovered, setHovered] = useState<DailySpend | null>(null);

  return (
    <div className="relative">
      {hovered && (
        <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded bg-foreground px-2 py-0.5 text-xs whitespace-nowrap text-background">
          {formatShortDate(hovered.date)}:{" "}
          {formatCurrency(hovered.amount, primaryCurrency, false)}
        </div>
      )}
      <div className="flex items-end gap-px" style={{ height: 80 }}>
        {data.map((d) => {
          const heightPct = max > 0 ? (d.amount / max) * 100 : 0;
          const isHov = hovered?.date === d.date;
          return (
            <div
              key={d.date}
              className="relative flex-1 cursor-pointer"
              style={{ height: "100%" }}
              onMouseEnter={() => setHovered(d)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className={cn(
                  "absolute bottom-0 w-full rounded-t-sm transition-colors",
                  isHov ? "bg-chart-1" : "bg-chart-1/30"
                )}
                style={{
                  height: `${heightPct}%`,
                  minHeight: d.amount > 0 ? 2 : 0,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>1</span>
        <span>{Math.ceil(data.length / 2)}</span>
        <span>{data.length}</span>
      </div>
    </div>
  );
}
