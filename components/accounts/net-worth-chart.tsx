"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { formatCurrency, formatShortDate, fmtAxis } from "@/lib/format";
import type { NetWorthPoint } from "@/lib/lunchmoney/balance-history";

const chartConfig = {
  total: { label: "Net Worth", color: "var(--chart-1)" },
};

export function NetWorthChart({
  data,
  primaryCurrency,
}: {
  data: NetWorthPoint[];
  primaryCurrency: string;
}) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    date: formatShortDate(d.date),
    total: d.total,
  }));

  // Show first/middle/last x-axis labels; all labels when ≤ 6 points
  const labelSet =
    data.length <= 6
      ? new Set(chartData.map((d) => d.date))
      : new Set([
          chartData[0].date,
          chartData[Math.floor((chartData.length - 1) / 2)].date,
          chartData[chartData.length - 1].date,
        ]);

  return (
    <ChartContainer config={chartConfig} className="mt-2 h-[200px] w-full">
      <AreaChart
        data={chartData}
        margin={{ top: 8, right: 8, bottom: 0, left: 4 }}
      >
        <defs>
          <linearGradient id="nw-fill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-total)"
              stopOpacity={0.25}
            />
            <stop
              offset="95%"
              stopColor="var(--color-total)"
              stopOpacity={0.02}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={9}
          tick={({ x, y, payload }) =>
            labelSet.has(payload.value) ? (
              <text
                x={x}
                y={(y as number) + 10}
                textAnchor="middle"
                fontSize={9}
                fill="var(--muted-foreground)"
              >
                {payload.value}
              </text>
            ) : (
              <g />
            )
          }
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          fontSize={9}
          width={68}
          tickFormatter={(v) => fmtAxis(v, primaryCurrency)}
        />
        <ChartTooltip
          cursor={{
            stroke: "var(--foreground)",
            strokeDasharray: "3 3",
            opacity: 0.35,
          }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                <p className="mb-1 font-medium">{label}</p>
                <p
                  className="font-mono tabular-nums"
                  style={{ color: "var(--color-total)" }}
                >
                  {formatCurrency(
                    payload[0].value as number,
                    primaryCurrency,
                    true
                  )}
                </p>
              </div>
            );
          }}
        />
        <Area
          dataKey="total"
          type="monotone"
          fill="url(#nw-fill)"
          stroke="var(--color-total)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3.5, strokeWidth: 1.5, stroke: "var(--background)" }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
