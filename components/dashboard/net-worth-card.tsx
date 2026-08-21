"use client";

import { Area, AreaChart, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { MONTH_NAMES } from "@/lib/date-utils";
import type { NetFlowPoint } from "@/lib/lunchmoney/analytics";
import type { NetWorth } from "@/lib/account-utils";

const chartConfig = {
  value: { label: "Value" },
} satisfies ChartConfig;

/**
 * Net worth hero.
 *
 * Lunch Money has no historical-balance endpoint, so the curve is derived:
 * today's balances walked backwards through the month's net cash flow. That is
 * exact for the current month's cash movements but ignores market moves on
 * investment accounts, hence the caption. For a past month there is no balance
 * to anchor to, so the same series is drawn from zero as cumulative cash flow.
 */
export function NetWorthCard({
  netWorth,
  netFlowSeries,
  year,
  month,
  primaryCurrency,
  loading,
}: {
  netWorth: NetWorth | null;
  netFlowSeries: NetFlowPoint[];
  year: number;
  month: number;
  primaryCurrency: string;
  loading: boolean;
}) {
  const now = new Date();
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;
  const anchored = netWorth != null && isCurrentMonth;

  const monthNet = netFlowSeries.at(-1)?.net ?? 0;
  const positive = monthNet >= 0;

  const chartData = netFlowSeries.map((p) => ({
    date: p.date,
    value: anchored ? netWorth.netWorth - (monthNet - p.net) : p.net,
  }));

  const startingValue = anchored ? netWorth.netWorth - monthNet : 0;
  const pct =
    startingValue !== 0 ? (monthNet / Math.abs(startingValue)) * 100 : null;

  const color = positive ? "var(--bento-positive)" : "var(--bento-negative)";
  const Arrow = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className="gap-3 overflow-hidden">
      <CardContent className="pb-1">
        <p className="text-xs font-medium tracking-[0.14em] text-bento-subtle uppercase">
          Net worth
        </p>
        {loading || (netWorth === null && isCurrentMonth) ? (
          <div className="mt-2 h-11 w-56 animate-pulse rounded-lg bg-bento-raised" />
        ) : (
          <p className="mt-1 font-heading text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
            {formatCurrency(netWorth?.netWorth ?? 0, primaryCurrency, true)}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span
            className={cn(
              "flex items-center gap-1 font-medium tabular-nums",
              positive ? "text-bento-positive" : "text-bento-negative"
            )}
          >
            <Arrow className="size-4" />
            {positive ? "+" : "−"}
            {formatCurrency(Math.abs(monthNet), primaryCurrency, true)}
            {pct !== null && (
              <span className="font-normal">
                ({pct >= 0 ? "" : "−"}
                {Math.abs(pct).toFixed(1)}%)
              </span>
            )}
          </span>
          <span className="text-bento-subtle">
            {isCurrentMonth ? "this month" : `in ${MONTH_NAMES[month - 1]}`}
          </span>
        </div>

        {netWorth && (
          <div className="mt-4 flex items-center gap-6 text-xs">
            <div>
              <p className="text-bento-subtle">Assets</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(netWorth.totalAssets, primaryCurrency)}
              </p>
            </div>
            <div className="h-8 w-px bg-bento-hairline" />
            <div>
              <p className="text-bento-subtle">Liabilities</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(netWorth.totalLiabilities, primaryCurrency)}
              </p>
            </div>
          </div>
        )}

        <p className="mt-4 text-[11px] text-bento-subtle">
          {anchored
            ? "Estimated from current balances and this month's cash flow — excludes market movement."
            : `Cumulative net cash flow in ${MONTH_NAMES[month - 1]} ${year}.`}
        </p>
      </CardContent>

      <div className="-mb-6">
        <ChartContainer config={chartConfig} className="h-32 w-full sm:h-40">
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="net-worth-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis
              hide
              domain={
                anchored ? ["dataMin - 200", "dataMax + 200"] : ["auto", "auto"]
              }
            />
            <ChartTooltip
              cursor={{ stroke: "var(--bento-hairline)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as {
                  date: string;
                  value: number;
                };
                return (
                  <div className="rounded-xl glass px-2.5 py-1.5 text-xs">
                    <p className="text-bento-subtle">
                      {formatShortDate(point.date)}
                    </p>
                    <p className="font-medium tabular-nums">
                      {formatCurrency(point.value, primaryCurrency, true)}
                    </p>
                  </div>
                );
              }}
            />
            <Area
              dataKey="value"
              type="monotone"
              stroke={color}
              strokeWidth={2}
              fill="url(#net-worth-fill)"
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </Card>
  );
}
