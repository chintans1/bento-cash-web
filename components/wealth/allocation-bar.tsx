"use client";

import { formatCurrency } from "@/lib/format";
import type { AllocationSlice } from "@/lib/lunchmoney/wealth-analytics";

export function AllocationBar({
  slices,
  primaryCurrency,
}: {
  slices: AllocationSlice[];
  primaryCurrency: string;
}) {
  if (slices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No asset data available.</p>
    );
  }

  return (
    <div>
      {/* Segmented bar */}
      <div className="mb-4 flex h-6 w-full overflow-hidden rounded-full">
        {slices.map((s) => (
          <div
            key={s.bucket}
            title={`${s.label}: ${s.pct.toFixed(1)}%`}
            style={{
              width: `${s.pct}%`,
              backgroundColor: `var(${s.colorVar})`,
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {slices.map((s) => (
          <div key={s.bucket} className="flex items-center gap-2">
            <div
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: `var(${s.colorVar})` }}
            />
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
              {s.label}
            </span>
            <span className="font-mono text-sm tabular-nums">
              {formatCurrency(s.total, primaryCurrency, false)}
            </span>
            <span className="w-10 text-right font-mono text-xs text-muted-foreground tabular-nums">
              {s.pct.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
