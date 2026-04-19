"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/ui/chart";
import { fmtAxis } from "@/lib/format";
import type { ProjectionPoint } from "@/lib/lunchmoney/wealth-analytics";

const chartConfig = {
  aggressive: { label: "Aggressive (10%)", color: "var(--chart-1)" },
  moderate: { label: "Moderate (7%)", color: "var(--chart-2)" },
  conservative: { label: "Conservative (4%)", color: "var(--chart-3)" },
};

export function GrowthProjectionChart({
  data,
  primaryCurrency,
}: {
  data: ProjectionPoint[];
  primaryCurrency: string;
}) {
  if (data.length === 0) return null;

  const maxYear = data[data.length - 1].year;
  const step = maxYear <= 10 ? 1 : 5;
  const xTicks = data.filter((d) => d.year % step === 0).map((d) => d.year);

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="year"
          ticks={xTicks}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={9}
          tickFormatter={(v) => (v === 0 ? "Now" : `+${v}yr`)}
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
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const year = payload[0]?.payload?.year as number;
            return (
              <div className="rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                <p className="mb-1.5 font-medium text-muted-foreground">
                  {year === 0 ? "Now" : `Year ${year}`}
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
                        <span className="text-muted-foreground">
                          {
                            chartConfig[
                              item.dataKey as keyof typeof chartConfig
                            ]?.label
                          }
                        </span>
                      </div>
                      <span className="font-mono font-medium tabular-nums">
                        {fmtAxis(item.value as number, primaryCurrency)}
                      </span>
                    </div>
                  ))}
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
        {(["aggressive", "moderate", "conservative"] as const).map((key) => (
          <Line
            key={key}
            dataKey={key}
            type="monotone"
            stroke={`var(--color-${key})`}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 3.5,
              strokeWidth: 1.5,
              stroke: "var(--background)",
            }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
