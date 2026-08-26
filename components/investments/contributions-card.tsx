import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { MONTH_NAMES } from "@/lib/date-utils";

/**
 * Money moved into investment accounts this month.
 *
 * This card stands where a returns figure would in most portfolio trackers.
 * Lunch Money has no cost basis and no price history, so a return can't be
 * computed — but contributions can, from the transactions on those accounts.
 */
export function ContributionsCard({
  net,
  contributed,
  withdrawn,
  month,
  primaryCurrency,
  loading,
}: {
  net: number;
  contributed: number;
  withdrawn: number;
  month: number;
  primaryCurrency: string;
  loading: boolean;
}) {
  const positive = net >= 0;
  const Arrow = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle className="text-lg">Contributions</CardTitle>
          <span className="text-xs text-bento-subtle">
            {MONTH_NAMES[month - 1]}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-32 animate-pulse rounded-lg bg-bento-raised" />
        ) : (
          <>
            <p
              className={cn(
                "flex items-center gap-1 font-heading text-2xl font-semibold tabular-nums",
                positive ? "text-bento-positive" : "text-bento-negative"
              )}
            >
              <Arrow className="size-5" />
              {positive ? "+" : "−"}
              {formatCurrency(Math.abs(net), primaryCurrency)}
            </p>

            <dl className="mt-4 flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-bento-subtle">In</dt>
                <dd className="font-mono tabular-nums">
                  {formatCurrency(contributed, primaryCurrency)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-bento-subtle">Out</dt>
                <dd className="font-mono tabular-nums">
                  {formatCurrency(withdrawn, primaryCurrency)}
                </dd>
              </div>
            </dl>

            <p className="mt-4 text-[11px] text-bento-subtle">
              Money moved in and out of investment accounts. Lunch Money
              doesn&apos;t expose cost basis or prices, so gains aren&apos;t
              part of this.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
