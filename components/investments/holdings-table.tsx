import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { formatUpdated } from "@/lib/account-utils";
import { categoryColor } from "@/lib/lunchmoney/category-colors";
import type { AllocationSlice } from "@/lib/investment-utils";

/**
 * Every investment account, ranked by value.
 *
 * The equivalent of a holdings table for the data Lunch Money actually
 * returns: it has no positions behind an account, so the account is the row.
 */
export function HoldingsTable({
  slices,
  primaryCurrency,
}: {
  slices: AllocationSlice[];
  primaryCurrency: string;
}) {
  if (slices.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Accounts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[1fr_auto] gap-4 px-1 pb-2 text-[11px] font-semibold tracking-wide text-bento-subtle uppercase sm:grid-cols-[1fr_80px_120px_100px]">
          <span>Account</span>
          <span className="hidden text-right sm:block">Share</span>
          <span className="text-right">Value</span>
          <span className="hidden text-right sm:block">Updated</span>
        </div>

        <ul className="flex flex-col">
          {slices.map((slice) => {
            const color = categoryColor(
              slice.label + (slice.institution ?? "")
            );
            return (
              <li
                key={slice.id}
                className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl px-1 py-2.5 transition-colors hover:bg-bento-raised sm:grid-cols-[1fr_80px_120px_100px]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: `color-mix(in oklab, ${color} var(--chip-tint), transparent)`,
                      color: `color-mix(in oklab, ${color} 80%, var(--foreground))`,
                    }}
                    aria-hidden="true"
                  >
                    {slice.label.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {slice.label}
                    </p>
                    <p className="truncate text-[11px] text-bento-subtle">
                      {slice.institution ?? "Manual"}
                      <span className="sm:hidden">
                        {" · "}
                        {slice.share.toFixed(1)}%
                      </span>
                    </p>
                  </div>
                </div>

                <span className="hidden text-right font-mono text-xs text-bento-subtle tabular-nums sm:block">
                  {slice.share.toFixed(1)}%
                </span>

                <span className="text-right font-mono text-sm font-medium tabular-nums">
                  {formatCurrency(slice.value, primaryCurrency)}
                </span>

                <span className="hidden text-right text-[11px] text-bento-subtle tabular-nums sm:block">
                  {formatUpdated(slice.lastUpdated)}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
