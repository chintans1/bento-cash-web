"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { MonthlyReport } from "@/lib/lunchmoney/reports";
import { formatCurrency } from "@/lib/format";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCompactCurrency } from "./report-ui";

export function MonthlyBarChart({
  data,
  dataKey,
  label,
  color,
  currency,
}: {
  data: MonthlyReport[];
  dataKey: "income" | "spend";
  label: string;
  color: string;
  currency: string;
}) {
  const config = { [dataKey]: { label, color } } satisfies ChartConfig;

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-64 w-full"
      initialDimension={{ width: 900, height: 256 }}
    >
      <BarChart data={data} margin={{ left: 0, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tickMargin={10}
          minTickGap={24}
          tickFormatter={(month: string) => month.split(" ")[0]}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          width={58}
          tickFormatter={(value: number) =>
            formatCompactCurrency(value, currency)
          }
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value) => (
                <span className="font-mono font-medium tabular-nums">
                  {formatCurrency(Number(value), currency, true)}
                </span>
              )}
            />
          }
        />
        <Bar
          dataKey={dataKey}
          fill={`var(--color-${dataKey})`}
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
