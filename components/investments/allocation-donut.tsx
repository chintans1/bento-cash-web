"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { categoryColor } from "@/lib/lunchmoney/category-colors";
import type { AllocationSlice } from "@/lib/investment-utils";

const chartConfig = { value: { label: "Value" } } satisfies ChartConfig;

/**
 * Portfolio value with its allocation as a ring around it.
 *
 * Slices are accounts, because that's the finest grain Lunch Money exposes —
 * there is no holdings or securities data behind an account balance.
 */
export function AllocationDonut({
  slices,
  total,
  primaryCurrency,
  loading,
}: {
  slices: AllocationSlice[];
  total: number;
  primaryCurrency: string;
  loading: boolean;
}) {
  const data = useMemo(
    () =>
      slices.map((slice) => ({
        ...slice,
        fill: categoryColor(slice.label + (slice.institution ?? "")),
      })),
    [slices]
  );

  return (
    <Card className="h-full justify-center">
      <CardContent>
        {loading ? (
          <div className="mx-auto size-56 animate-pulse rounded-full bg-bento-raised" />
        ) : slices.length === 0 ? (
          <p className="py-16 text-center text-sm text-bento-subtle">
            No investment accounts found.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
            <div className="relative shrink-0">
              <ChartContainer
                config={chartConfig}
                className="aspect-square h-56 w-56"
              >
                <PieChart>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const slice = payload[0].payload as AllocationSlice;
                      return (
                        <div className="rounded-xl glass px-2.5 py-1.5 text-xs glass-blur">
                          <p className="font-medium">{slice.label}</p>
                          <p className="text-bento-subtle tabular-nums">
                            {formatCurrency(slice.value, primaryCurrency)} ·{" "}
                            {slice.share.toFixed(1)}%
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="68%"
                    outerRadius="100%"
                    paddingAngle={2}
                    strokeWidth={0}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {data.map((slice) => (
                      <Cell key={slice.id} fill={slice.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="font-heading text-2xl font-semibold tabular-nums">
                  {formatCurrency(total, primaryCurrency)}
                </p>
                <p className="text-[11px] tracking-wide text-bento-subtle uppercase">
                  Portfolio value
                </p>
              </div>
            </div>

            <ul className="flex w-full min-w-0 flex-col gap-2.5">
              {data.map((slice) => (
                <li key={slice.id} className="flex items-center gap-2.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.fill }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {slice.label}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-bento-subtle tabular-nums">
                    {slice.share.toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
