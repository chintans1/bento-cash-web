"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import Link from "next/link";
import { formatCurrency, formatShortDate } from "@/lib/format";
import type { spendingPace } from "@/lib/lunchmoney/report-comparisons";
import { amountChange } from "./report-breakdown";
import { EmptyBreakdown, formatCompactCurrency } from "./report-ui";

const config = {
  actual: { label: "This month", color: "var(--bento-brand)" },
  typical: { label: "Recent months average", color: "var(--bento-subtle)" },
};

export function SpendingPaceReport({
  pace,
  currency,
  today,
  baselineLabel,
}: {
  pace: ReturnType<typeof spendingPace>;
  currency: string;
  today: string;
  baselineLabel?: string;
}) {
  const money = (value: number) => formatCurrency(value, currency, true);
  const change = pace.typical === null ? null : pace.current - pace.typical;
  const baseline =
    baselineLabel ??
    (pace.baselineCount === 1
      ? "the previous month with activity"
      : `the average of ${pace.baselineCount} recent months with activity`);
  const chartConfig = {
    ...config,
    typical: {
      ...config.typical,
      label: baselineLabel ?? config.typical.label,
    },
  };
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-2xl font-semibold">
          {money(pace.current)} spent through {formatShortDate(today)}
        </h2>
        <p className="mt-1 text-sm text-bento-subtle">
          {change === null
            ? "No posted activity in the selected comparison window."
            : Math.abs(change) < 0.005
              ? `Matches ${baseline} through the same day.`
              : `${amountChange(change, currency)} than ${money(pace.typical!)} through the same day, based on ${baseline}.`}
        </p>
      </div>
      {pace.projected !== null && (
        <div className="rounded-xl bg-bento-raised px-4 py-3 text-sm">
          <strong className="tabular-nums">{money(pace.projected)}</strong>{" "}
          projected at month end
          <p className="mt-1 text-xs text-bento-subtle">
            Spent so far plus the spending after this day in the comparison.
          </p>
        </div>
      )}
      {pace.current === 0 && !pace.typical ? (
        <EmptyBreakdown>No spending to show yet.</EmptyBreakdown>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-bento-subtle">
            <span className="flex items-center gap-2">
              <span
                className="w-5 border-t-2 border-bento-brand"
                aria-hidden="true"
              />{" "}
              This month
            </span>
            {pace.typical !== null && (
              <span className="flex items-center gap-2">
                <span
                  className="w-5 border-t-2 border-dashed border-bento-subtle"
                  aria-hidden="true"
                />{" "}
                {chartConfig.typical.label}
              </span>
            )}
          </div>
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-64 w-full"
            initialDimension={{ width: 700, height: 256 }}
          >
            <LineChart data={pace.days} margin={{ right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={58}
                tickFormatter={(value: number) =>
                  formatCompactCurrency(value, currency)
                }
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(day) => `Day ${day}`}
                    formatter={(value, name) => (
                      <div className="flex w-full justify-between gap-4">
                        <span>
                          {chartConfig[name as keyof typeof chartConfig]?.label}
                        </span>
                        <strong>{money(Number(value))}</strong>
                      </div>
                    )}
                  />
                }
              />
              <Line
                type="linear"
                dataKey="typical"
                stroke="var(--color-typical)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={pace.days.length === 1}
                isAnimationActive={false}
              />
              <Line
                type="linear"
                dataKey="actual"
                stroke="var(--color-actual)"
                strokeWidth={3}
                dot={pace.days.length === 1}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        </>
      )}
      {pace.typical !== null && pace.drivers.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">
            What’s driving the difference
          </h3>
          <ul className="divide-y divide-bento-hairline">
            {pace.drivers.slice(0, 3).map((row) => (
              <li
                key={row.key}
                className="flex items-center justify-between gap-3 py-2 text-xs"
              >
                {row.amount > 0 ? (
                  <Link
                    className="underline underline-offset-2"
                    href={`/transactions?month=${today.slice(0, 7)}&direction=spending&category=${row.categoryId}&through=${today}`}
                  >
                    {row.name}
                  </Link>
                ) : (
                  <span>{row.name}</span>
                )}
                <span className="shrink-0 tabular-nums">
                  {amountChange(row.amount - row.previous, currency)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
