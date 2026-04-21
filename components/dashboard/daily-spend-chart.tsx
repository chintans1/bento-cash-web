"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency, formatShortDate } from "@/lib/format";
import type { DailySpend } from "@/lib/lunchmoney/analytics";

const chartConfig = {
  amount: { label: "Spend", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function DailySpendChart({
  data,
  primaryCurrency,
}: {
  data: DailySpend[];
  primaryCurrency: string;
}) {
  return (
    <ChartContainer config={chartConfig} className="h-24 w-full">
      <BarChart data={data} barCategoryGap={2}>
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10 }}
          tickFormatter={(v: string) => {
            const day = new Date(v + "T12:00:00").getDate();
            const total = data.length;
            return day === 1 || day === Math.ceil(total / 2) || day === total
              ? String(day)
              : "";
          }}
        />
        <YAxis hide />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", radius: 4 }}
          content={
            <ChartTooltipContent
              labelFormatter={(v) => formatShortDate(String(v))}
              formatter={(value) =>
                formatCurrency(Number(value), primaryCurrency, false)
              }
            />
          }
        />
        <Bar dataKey="amount" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
