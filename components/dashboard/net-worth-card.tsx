"use client";

import { Area, AreaChart, ReferenceLine, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { MONTH_NAMES, formatMonthKey, monthKeyOf } from "@/lib/date-utils";
import type { NetWorthPoint } from "@/lib/lunchmoney/net-worth-history";
import type { NetWorth } from "@/lib/account-utils";

const chartConfig = {
  netWorth: { label: "Net worth", color: "var(--series-1)" },
} satisfies ChartConfig;

/**
 * Net worth hero: the figure, and the year of month-end figures behind it.
 *
 * The curve is real net worth, from LM's balance history — investment moves
 * and all — not a number derived from transactions. The headline still comes
 * from live account balances when the current month is selected, because
 * that's the figure the accounts page shows and the only one that means
 * "right now"; a past month takes its headline from that month's snapshot.
 */
export function NetWorthCard({
  netWorth,
  history,
  historyLoading,
  year,
  month,
  primaryCurrency,
}: {
  netWorth: NetWorth | null;
  history: NetWorthPoint[];
  historyLoading: boolean;
  year: number;
  month: number;
  primaryCurrency: string;
}) {
  const now = new Date();
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;
  const monthKey = monthKeyOf(year, month);

  // The selected month's stored snapshot, when history reaches that far.
  const latest = history.at(-1);
  const snapshot = latest?.month === monthKey ? latest : null;

  // A NetWorthPoint is a NetWorth with a month on it, so today's figure and a
  // stored one are the same shape — the card never has to translate.
  const shown: NetWorth | null = isCurrentMonth ? netWorth : snapshot;

  // Waiting on whichever request feeds the headline for this month.
  const pending = isCurrentMonth ? netWorth === null : historyLoading;

  // The month before the one on screen, so the delta reads "since the end of
  // last month" — which is what the headline is being compared against.
  const previous = snapshot ? (history.at(-2) ?? null) : null;
  const change = shown && previous ? shown.netWorth - previous.netWorth : null;
  const up = (change ?? 0) >= 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;

  // Divided by the absolute previous figure, so a net worth climbing out of
  // the red reads as growth rather than a negative percentage. Nothing to
  // divide by at zero.
  const pct =
    change !== null && previous && previous.netWorth !== 0
      ? (change / Math.abs(previous.netWorth)) * 100
      : null;

  const crossesZero = history.some((p) => p.netWorth < 0);
  const charted = history.length >= 2;

  return (
    <Card className="gap-3 overflow-hidden">
      <CardContent className="pb-1">
        <p className="text-xs font-medium tracking-[0.14em] text-bento-subtle uppercase">
          Net worth
        </p>

        {/* One skeleton group, sized to the loaded layout, so the hero holds
            its height instead of growing under the cards below it. */}
        {pending ? (
          <div aria-hidden>
            <Skeleton className="mt-1 h-10 w-56 rounded-lg sm:h-12" />
            <Skeleton className="mt-3 h-5 w-52 rounded-md" />
            <Skeleton className="mt-5 h-8 w-44 rounded-md" />
          </div>
        ) : shown ? (
          <p className="mt-1 font-heading text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
            {formatCurrency(shown.netWorth, primaryCurrency, true)}
          </p>
        ) : (
          <p className="mt-2 text-sm text-bento-subtle">
            No balance recorded for {MONTH_NAMES[month - 1]} {year}.
          </p>
        )}

        {previous && change !== null && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span
              className={cn(
                "flex items-center gap-1 font-medium tabular-nums",
                up ? "text-bento-positive" : "text-bento-negative"
              )}
            >
              <Arrow className="size-4" />
              {up ? "+" : "−"}
              {formatCurrency(Math.abs(change), primaryCurrency, true)}
              {pct !== null && (
                <span className="font-normal">
                  ({up ? "+" : "−"}
                  {Math.abs(pct).toFixed(1)}%)
                </span>
              )}
            </span>
            <span className="text-bento-subtle">
              since {formatMonthKey(previous.month)}
            </span>
          </div>
        )}

        {shown && (
          <div className="mt-4 flex items-center gap-6 text-xs">
            <div>
              <p className="text-bento-subtle">Assets</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(shown.totalAssets, primaryCurrency)}
              </p>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div>
              <p className="text-bento-subtle">Liabilities</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(shown.totalLiabilities, primaryCurrency)}
              </p>
            </div>
          </div>
        )}

        <p className="mt-4 text-[11px] text-pretty text-bento-subtle">
          {charted && latest ? (
            <>
              Month-end balances, {formatMonthKey(history[0].month)} –{" "}
              {formatMonthKey(latest.month)}.
              {isCurrentMonth && " The figure above is as of today."}
            </>
          ) : historyLoading ? (
            "Loading balance history…"
          ) : (
            "Lunch Money has no balance history to chart yet."
          )}
        </p>
      </CardContent>

      {charted && (
        <div className="-mb-6">
          <ChartContainer config={chartConfig} className="h-32 w-full sm:h-40">
            <AreaChart
              data={history}
              margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="net-worth-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--series-1)"
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--series-1)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <YAxis hide domain={["auto", "auto"]} />
              {/* Only worth drawing when the series actually goes negative. */}
              {crossesZero && (
                <ReferenceLine y={0} stroke="var(--bento-hairline)" />
              )}
              <ChartTooltip
                cursor={{ stroke: "var(--bento-hairline)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as NetWorthPoint;
                  return (
                    <div className="rounded-xl glass px-2.5 py-1.5 text-xs">
                      <p className="text-bento-subtle">
                        {formatMonthKey(point.month)}
                      </p>
                      <p className="font-medium tabular-nums">
                        {formatCurrency(point.netWorth, primaryCurrency, true)}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                dataKey="netWorth"
                type="monotone"
                stroke="var(--series-1)"
                strokeWidth={2}
                fill="url(#net-worth-fill)"
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      )}
    </Card>
  );
}
