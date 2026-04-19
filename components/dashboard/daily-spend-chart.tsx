"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { formatCurrency, formatShortDate } from "@/lib/format";
import type { DailySpend } from "@/lib/lunchmoney/analytics";

const chartConfig = {
  amount: { label: "Spend", color: "var(--chart-1)" },
};

export function DailySpendChart({
  data,
  primaryCurrency,
}: {
  data: DailySpend[];
  primaryCurrency: string;
}) {
  if (data.length === 0) return null;

  const midDay = data[Math.floor((data.length - 1) / 2)]?.date ?? "";

  return (
    <ChartContainer config={chartConfig} className="h-[96px] w-full">
      <BarChart
        data={data}
        margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
        barCategoryGap="15%"
      >
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          fontSize={9}
          ticks={[data[0]?.date, midDay, data[data.length - 1]?.date]}
          tickFormatter={(v) => {
            const d = new Date(`${v}T12:00:00`);
            return String(d.getDate());
          }}
          height={18}
        />
        <YAxis hide />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as DailySpend;
            return (
              <div className="rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                <p className="mb-0.5 font-medium">{formatShortDate(d.date)}</p>
                <p
                  className="font-mono tabular-nums"
                  style={{ color: "var(--color-amount)" }}
                >
                  {formatCurrency(d.amount, primaryCurrency, false)}
                </p>
              </div>
            );
          }}
        />
        <Bar
          dataKey="amount"
          fill="var(--color-amount)"
          opacity={0.4}
          radius={[2, 2, 0, 0]}
          activeBar={{ opacity: 1 }}
        />
      </BarChart>
    </ChartContainer>
  );
}
