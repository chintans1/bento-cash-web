"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { MONTH_NAMES, prevMonthOf } from "@/lib/date-utils";
import type { CumulativeSpendPoint } from "@/lib/lunchmoney/analytics";

const chartConfig = {
  current: { label: "This month", color: "var(--series-1)" },
  previous: { label: "Last month", color: "var(--bento-subtle)" },
} satisfies ChartConfig;

/** Compact axis label: 1500 → $1.5K, 16000 → $16K */
function compact(value: number, currency: string): string {
  if (Math.abs(value) < 1000) return formatCurrency(value, currency);

  const thousands = value / 1000;
  const digits =
    Math.abs(thousands) < 10 && !Number.isInteger(thousands) ? 1 : 0;
  try {
    return `${new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    }).format(thousands)}K`;
  } catch {
    return `${thousands.toFixed(digits)}K ${currency.toUpperCase()}`;
  }
}

/**
 * Cumulative spend for the selected month drawn against the previous month, so
 * "am I running hot this month?" is answerable at a glance.
 */
export function SpendingTrendCard({
  data,
  year,
  month,
  primaryCurrency,
  loading,
}: {
  data: CumulativeSpendPoint[];
  year: number;
  month: number;
  primaryCurrency: string;
  loading: boolean;
}) {
  const prev = prevMonthOf(year, month);
  const currentTotal = data.reduce<number>(
    (last, p) => (p.current != null ? p.current : last),
    0
  );
  const previousTotal = data.reduce<number>(
    (last, p) => (p.previous != null ? p.previous : last),
    0
  );
  const diff = currentTotal - previousTotal;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">Spending</CardTitle>
            <p className="mt-1 text-xs text-bento-subtle">
              Cumulative · {MONTH_NAMES[month - 1]} vs{" "}
              {MONTH_NAMES[prev.month - 1]}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xl font-semibold tabular-nums">
              {formatCurrency(currentTotal, primaryCurrency)}
            </p>
            <p className="text-xs text-bento-subtle tabular-nums">
              {diff >= 0 ? "+" : "−"}
              {formatCurrency(Math.abs(diff), primaryCurrency)} vs last month
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-[var(--series-1)]" />
            <span className="text-bento-subtle">This month</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-bento-subtle" />
            <span className="text-bento-subtle">Last month</span>
          </span>
        </div>

        {loading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : (
          <ChartContainer config={chartConfig} className="h-48 w-full">
            <AreaChart
              data={data}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="spend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--series-1)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--series-1)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="var(--bento-hairline)"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                tick={{ fontSize: 10 }}
                tickFormatter={(v: number) => compact(v, primaryCurrency)}
              />
              <ChartTooltip
                cursor={{ stroke: "var(--bento-hairline)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-xl glass px-2.5 py-1.5 text-xs">
                      <p className="mb-1 text-bento-subtle">Day {label}</p>
                      {payload.map((entry) => (
                        <p
                          key={String(entry.dataKey)}
                          className="flex justify-between gap-4 tabular-nums"
                        >
                          <span className="text-bento-subtle">
                            {entry.dataKey === "current"
                              ? MONTH_NAMES[month - 1]
                              : MONTH_NAMES[prev.month - 1]}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(
                              Number(entry.value),
                              primaryCurrency
                            )}
                          </span>
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Area
                dataKey="previous"
                type="monotone"
                stroke="var(--bento-subtle)"
                strokeWidth={1.5}
                fill="none"
                connectNulls
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
              <Area
                dataKey="current"
                type="monotone"
                stroke="var(--series-1)"
                strokeWidth={2.5}
                fill="url(#spend-fill)"
                connectNulls
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
