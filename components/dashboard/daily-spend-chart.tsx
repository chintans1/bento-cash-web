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
  recurring: { label: "Recurring", color: "var(--chart-2)" },
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
          cursor={{ fill: "var(--bento-muted)", radius: 4 }}
          content={
            <ChartTooltipContent
              labelFormatter={(v) => formatShortDate(String(v))}
              formatter={(value, name) => (
                <>
                  <div
                    className="h-2 w-2 shrink-0 rounded-[2px]"
                    style={{
                      backgroundColor:
                        name === "recurring"
                          ? "var(--chart-2)"
                          : "var(--chart-1)",
                    }}
                  />
                  <div className="flex flex-1 justify-between gap-4">
                    <span className="text-muted-foreground">
                      {name === "recurring" ? "Recurring" : "Spend"}
                    </span>
                    <span className="font-mono font-medium tabular-nums">
                      {formatCurrency(Number(value), primaryCurrency, false)}
                    </span>
                  </div>
                </>
              )}
            />
          }
        />
        <Bar
          dataKey="amount"
          stackId="daily"
          fill="var(--chart-1)"
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="recurring"
          stackId="daily"
          fill="var(--chart-2)"
          radius={[2, 2, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
