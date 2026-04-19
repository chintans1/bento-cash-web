"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/ui/chart";
import { formatCurrency, fmtAxis } from "@/lib/format";
import type { MonthlySummary } from "@/lib/lunchmoney/wealth-analytics";

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const chartConfig = {
  income: { label: "Income", color: "#22c55e" },
  expenses: { label: "Expenses", color: "var(--chart-1)" },
};

export function CashFlowChart({
  data,
  primaryCurrency,
}: {
  data: MonthlySummary[];
  primaryCurrency: string;
}) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    label: `${SHORT_MONTHS[d.month - 1]} ${d.year}`,
    income: d.income,
    expenses: d.expenses,
    net: d.net,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[180px] w-full">
      <LineChart
        data={chartData}
        margin={{ top: 8, right: 8, bottom: 0, left: 4 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={9}
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
            const net = (payload[0]?.payload?.net as number) ?? 0;
            return (
              <div className="rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                <p className="mb-1.5 font-medium text-muted-foreground">
                  {label}
                </p>
                <div className="grid gap-1">
                  {payload.map((item) => (
                    <div
                      key={String(item.dataKey ?? item.name)}
                      className="flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-1.5 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-muted-foreground capitalize">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-mono font-medium tabular-nums">
                        {formatCurrency(
                          item.value as number,
                          primaryCurrency,
                          false
                        )}
                      </span>
                    </div>
                  ))}
                  <div className="mt-0.5 flex items-center justify-between gap-4 border-t pt-1">
                    <span className="text-muted-foreground">Net</span>
                    <span
                      className={`font-mono font-medium tabular-nums ${net >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
                    >
                      {net >= 0 ? "+" : ""}
                      {formatCurrency(net, primaryCurrency, false)}
                    </span>
                  </div>
                </div>
              </div>
            );
          }}
        />
        <ChartLegend
          content={({ payload, verticalAlign }) => (
            <ChartLegendContent
              payload={payload}
              verticalAlign={verticalAlign}
            />
          )}
        />
        <Line
          dataKey="income"
          type="monotone"
          stroke="var(--color-income)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3.5, strokeWidth: 1.5, stroke: "var(--background)" }}
        />
        <Line
          dataKey="expenses"
          type="monotone"
          stroke="var(--color-expenses)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3.5, strokeWidth: 1.5, stroke: "var(--background)" }}
        />
      </LineChart>
    </ChartContainer>
  );
}
