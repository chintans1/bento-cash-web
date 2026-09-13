"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import type { NormalizedAccount } from "@/lib/account-utils";
import type { BalanceHistoryAccount } from "@/lib/lunchmoney/client";
import {
  computeAccountHistorySeries,
  computeNetWorthHistory,
  historyForAccountGroup,
  paddedChartDomain,
  type AccountGroup,
} from "@/lib/lunchmoney/net-worth-history";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

const GROUPS: { value: AccountGroup; label: string }[] = [
  { value: "all", label: "All" },
  { value: "cash", label: "Cash" },
  { value: "investments", label: "Investments" },
  { value: "debt", label: "Debt" },
  { value: "other", label: "Other" },
];

const RANGES = [
  { value: 3, label: "3M" },
  { value: 6, label: "6M" },
  { value: 12, label: "1Y" },
  { value: 0, label: "All" },
];

const SERIES_COLORS = [
  "var(--series-1)",
  "var(--cat-4)",
  "var(--cat-5)",
  "var(--cat-6)",
  "var(--cat-1)",
  "var(--cat-2)",
  "var(--cat-7)",
];

function monthLabel(month: string) {
  const [year, value] = month.split("-").map(Number);
  return new Date(year, value - 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function Control({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-10 shrink-0 rounded-full px-3 text-xs font-medium transition-[color,background-color,scale] active:scale-[0.96]",
        active
          ? "bg-bento-surface text-bento-default shadow-sm"
          : "text-bento-subtle hover:text-bento-default"
      )}
    >
      {children}
    </button>
  );
}

export function NetWorthPerformanceCard({
  history,
  accounts,
  primaryCurrency,
}: {
  history: BalanceHistoryAccount[] | null;
  accounts: NormalizedAccount[];
  primaryCurrency: string;
}) {
  const [group, setGroup] = useState<AccountGroup>("all");
  const [range, setRange] = useState(12);

  const chart = useMemo(() => {
    if (!history) return null;

    const groupedHistory = historyForAccountGroup(history, accounts, group);
    const combined = computeNetWorthHistory(groupedHistory, accounts);
    const visibleCombined = range ? combined.slice(-range) : combined;
    const startMonth = visibleCombined[0]?.month;
    const individual =
      group === "all"
        ? []
        : computeAccountHistorySeries(history, accounts, group).map(
            (series, index) => ({
              ...series,
              color: SERIES_COLORS[index % SERIES_COLORS.length],
              points: series.points.filter(
                (point) => !startMonth || point.month >= startMonth
              ),
            })
          );
    const bySeries = individual.map(
      (series) =>
        [
          series,
          new Map(series.points.map((point) => [point.month, point.balance])),
        ] as const
    );
    const points = visibleCombined.map((point) => ({
      month: point.month,
      total: group === "debt" ? point.totalLiabilities : point.netWorth,
      ...Object.fromEntries(
        bySeries.map(([series, values]) => [
          series.key,
          values.get(point.month),
        ])
      ),
    }));
    const keys =
      group === "all" ? ["total"] : individual.map((item) => item.key);
    const values = points.flatMap((point) =>
      keys.flatMap((key) => {
        const value = point[key as keyof typeof point];
        return typeof value === "number" ? [value] : [];
      })
    );

    return {
      points,
      individual,
      domain: paddedChartDomain(values),
      first: points[0]?.total,
      latest: points.at(-1)?.total,
    };
  }, [history, accounts, group, range]);

  const change =
    chart?.first !== undefined && chart.latest !== undefined
      ? chart.latest - chart.first
      : null;
  const changePct =
    change !== null && chart?.first
      ? (change / Math.abs(chart.first)) * 100
      : null;
  const improving =
    change !== null && (group === "debt" ? change <= 0 : change >= 0);
  const Arrow = change !== null && change < 0 ? ArrowDownRight : ArrowUpRight;

  return (
    <Card className="mb-6 gap-4">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg">Net Worth Performance</CardTitle>
          <div className="flex rounded-full bg-bento-raised p-1">
            {RANGES.map((item) => (
              <Control
                key={item.value}
                active={range === item.value}
                onClick={() => setRange(item.value)}
              >
                {item.label}
              </Control>
            ))}
          </div>
        </div>
        <div className="-mx-1 flex overflow-x-auto rounded-full bg-bento-raised p-1">
          {GROUPS.map((item) => (
            <Control
              key={item.value}
              active={group === item.value}
              onClick={() => setGroup(item.value)}
            >
              {item.label}
            </Control>
          ))}
        </div>
      </CardHeader>

      {history === null ? (
        <CardContent>
          <Skeleton className="h-64 rounded-xl" />
        </CardContent>
      ) : !chart || chart.points.length < 2 || chart.latest === undefined ? (
        <CardContent className="py-14 text-center text-bento-subtle">
          No balance history for this account type.
        </CardContent>
      ) : (
        <>
          <CardContent className="flex flex-wrap items-end gap-x-4 gap-y-1">
            <p className="font-heading text-3xl font-semibold tabular-nums">
              {formatCurrency(chart.latest, primaryCurrency, true)}
            </p>
            {change !== null && changePct !== null && (
              <p
                className={cn(
                  "mb-1 flex items-center gap-1 text-sm font-medium tabular-nums",
                  improving ? "text-bento-positive" : "text-bento-negative"
                )}
              >
                <Arrow className="size-4" />
                {change >= 0 ? "+" : "−"}
                {formatCurrency(Math.abs(change), primaryCurrency, true)} (
                {changePct >= 0 ? "+" : "−"}
                {Math.abs(changePct).toFixed(1)}%)
              </p>
            )}
          </CardContent>

          <CardContent className="px-2 sm:px-4">
            <ChartContainer config={{}} className="h-64 w-full">
              <ComposedChart
                data={chart.points}
                margin={{ top: 8, right: 14, bottom: 4, left: 4 }}
              >
                <defs>
                  <linearGradient
                    id="net-worth-performance-fill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--series-1)"
                      stopOpacity={0.28}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--series-1)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--bento-hairline)"
                />
                <XAxis
                  dataKey="month"
                  tickFormatter={monthLabel}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                />
                <YAxis
                  domain={chart.domain}
                  tickFormatter={(value) =>
                    Intl.NumberFormat("en", {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(value)
                  }
                  tickLine={false}
                  axisLine={false}
                  width={46}
                />
                <ChartTooltip
                  cursor={{ stroke: "var(--bento-hairline)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-xl glass px-3 py-2 text-xs">
                        <p className="mb-1 text-bento-subtle">
                          {monthLabel(String(payload[0].payload.month))}
                        </p>
                        {payload.map((item) => {
                          const series = chart.individual.find(
                            (candidate) => candidate.key === item.dataKey
                          );

                          return (
                            <p
                              key={String(item.dataKey)}
                              className="flex justify-between gap-4 font-medium tabular-nums"
                            >
                              <span className="flex items-center gap-2">
                                <span
                                  aria-hidden
                                  className="size-2 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor:
                                      series?.color ?? "var(--series-1)",
                                  }}
                                />
                                <span>
                                  {item.dataKey === "total"
                                    ? "Net worth"
                                    : series?.name}
                                </span>
                              </span>
                              <span>
                                {formatCurrency(
                                  Number(item.value),
                                  primaryCurrency,
                                  true
                                )}
                              </span>
                            </p>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                {group === "all" ? (
                  <Area
                    dataKey="total"
                    type="monotone"
                    stroke="var(--series-1)"
                    strokeWidth={2.5}
                    fill="url(#net-worth-performance-fill)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                ) : (
                  chart.individual.map((series) => (
                    <Line
                      key={series.key}
                      dataKey={series.key}
                      type="monotone"
                      stroke={series.color}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      connectNulls
                      isAnimationActive={false}
                    />
                  ))
                )}
              </ComposedChart>
            </ChartContainer>
            {chart.individual.length > 0 && (
              <div className="flex flex-wrap justify-end gap-4 px-4 pb-2 text-xs text-bento-subtle">
                {chart.individual.map((series) => (
                  <span key={series.key} className="flex items-center gap-1.5">
                    <span
                      className="h-0.5 w-4"
                      style={{ backgroundColor: series.color }}
                    />
                    {series.name}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
}
