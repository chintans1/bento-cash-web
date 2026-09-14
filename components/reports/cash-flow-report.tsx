"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import type { ReportData } from "@/lib/lunchmoney/reports";
import { formatCurrency } from "@/lib/format";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  formatCompactCurrency,
  ReportMetric,
  ReportSection,
} from "./report-ui";

const chartConfig = {
  income: { label: "Income", color: "var(--cat-4)" },
  spend: { label: "Spending", color: "var(--cat-2)" },
  saved: { label: "Saved", color: "var(--series-2)" },
} satisfies ChartConfig;

export function CashFlowReport({
  data,
  currency,
}: {
  data: ReportData;
  currency: string;
}) {
  const savingsTone = data.averageSaved >= 0 ? "positive" : "negative";

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ReportMetric
          label="Average income"
          value={formatCurrency(data.averageIncome, currency)}
          note="per month"
        />
        <ReportMetric
          label="Average spending"
          value={formatCurrency(data.averageSpend, currency)}
          note="per month"
        />
        <ReportMetric
          label="Average saved"
          value={formatCurrency(data.averageSaved, currency)}
          note="income minus spending"
          tone={savingsTone}
        />
        <ReportMetric
          label="Savings rate"
          value={`${data.savingsRate.toFixed(0)}%`}
          note="across this period"
          tone={savingsTone}
        />
      </div>

      <ReportSection
        title="Income, spending, and what stayed"
        description="Compare complete months. The line shows the amount left after spending."
      >
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-72 w-full"
          initialDimension={{ width: 900, height: 288 }}
        >
          <ComposedChart data={data.months} margin={{ left: 0, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              minTickGap={24}
              tickFormatter={(label: string) => label.split(" ")[0]}
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
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-6">
                      <span className="text-bento-subtle">
                        {chartConfig[name as keyof typeof chartConfig]?.label}
                      </span>
                      <span className="font-mono font-medium tabular-nums">
                        {formatCurrency(Number(value), currency, true)}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="income"
              fill="var(--color-income)"
              radius={[5, 5, 0, 0]}
            />
            <Bar
              dataKey="spend"
              fill="var(--color-spend)"
              radius={[5, 5, 0, 0]}
            />
            <Line
              dataKey="saved"
              type="monotone"
              stroke="var(--color-saved)"
              strokeWidth={2.5}
              dot={false}
            />
          </ComposedChart>
        </ChartContainer>
      </ReportSection>
    </div>
  );
}
