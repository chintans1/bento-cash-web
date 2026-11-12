"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Area, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";
import type { NormalizedAccount } from "@/lib/account-utils";
import { INVESTMENT_GROUPS } from "@/lib/investment-utils";
import type { BalanceHistoryAccount } from "@/lib/lunchmoney/client";
import {
  computeNetWorthPerformance,
  type AccountGroup,
  type NetWorthPerformancePoint,
} from "@/lib/lunchmoney/net-worth-history";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type GroupOption = { value: AccountGroup; label: string };

const CASH_OPTIONS: GroupOption[] = [
  { value: "all", label: "All" },
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "other-cash", label: "Other cash" },
];
const ALL_INVESTMENTS: GroupOption = {
  value: "investments",
  label: "All investments",
};
const INVESTMENT_OPTIONS = INVESTMENT_GROUPS.map(({ id, label }) => ({
  value: id,
  label,
}));
const OTHER_OPTIONS: GroupOption[] = [
  { value: "debt", label: "Debt" },
  { value: "other", label: "Other" },
];
const GROUPS = [
  ...CASH_OPTIONS,
  ALL_INVESTMENTS,
  ...INVESTMENT_OPTIONS,
  ...OTHER_OPTIONS,
];
const OPTION_CLASS = "h-8 rounded-lg py-0 text-xs";

const RANGES = [
  { value: 3, label: "3M" },
  { value: 6, label: "6M" },
  { value: 12, label: "1Y" },
  { value: 0, label: "All" },
];

const CHART_CONFIG = {};
const COMPACT_NUMBER = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 2,
});

function monthLabel(month: string) {
  const [year, value] = month.split("-").map(Number);
  return new Date(year, value - 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function ChangeValue({
  value,
  currency,
  debt,
}: {
  value: number | null;
  currency: string;
  debt: boolean;
}) {
  if (value === null || value === 0) {
    return <span className="text-bento-subtle">—</span>;
  }

  const improving = debt ? value < 0 : value > 0;
  return (
    <span
      className={cn(
        "text-right tabular-nums",
        improving ? "text-bento-positive" : "text-bento-negative"
      )}
    >
      {value > 0 ? "+" : "−"}
      {formatCurrency(Math.abs(value), currency, true)}
    </span>
  );
}

function PerformanceTooltip({
  point,
  group,
  currency,
}: {
  point: NetWorthPerformancePoint;
  group: AccountGroup;
  currency: string;
}) {
  const label =
    group === "all"
      ? "Net worth"
      : GROUPS.find((item) => item.value === group)?.label;

  return (
    <div className="w-80 max-w-viewport-inset rounded-xl glass px-3 py-2.5 text-xs">
      <p className="text-bento-subtle">{monthLabel(point.month)}</p>
      <div className="mt-0.5 flex items-baseline justify-between gap-4 font-medium">
        <span>{label}</span>
        <span className="tabular-nums">
          {formatCurrency(point.total, currency, true)}
        </span>
      </div>
      {point.previousMonth && (
        <div className="mt-0.5 flex justify-between gap-4 text-bento-subtle">
          <span>from {monthLabel(point.previousMonth)}</span>
          <ChangeValue
            value={point.change}
            currency={currency}
            debt={group === "debt"}
          />
        </div>
      )}

      {point.breakdown.length > 0 && (
        <div className="mt-2 space-y-1.5 border-t border-bento-hairline pt-2">
          {point.breakdown.map((account) => (
            <div
              key={account.key}
              className="grid grid-cols-performance items-baseline gap-x-3"
            >
              <span className="truncate">{account.name}</span>
              <span className="tabular-nums">
                {formatCurrency(account.balance, currency, true)}
              </span>
              <ChangeValue
                value={account.change}
                currency={currency}
                debt={group === "debt"}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function NetWorthPerformanceCard({
  history,
  error,
  accounts,
  primaryCurrency,
  compact = false,
}: {
  history: BalanceHistoryAccount[] | null;
  error?: string | null;
  accounts: NormalizedAccount[];
  primaryCurrency: string;
  compact?: boolean;
}) {
  const [group, setGroup] = useState<AccountGroup>("all");
  const [range, setRange] = useState(12);

  const chart = useMemo(() => {
    if (!history) return null;
    return computeNetWorthPerformance(history, accounts, group, range);
  }, [history, accounts, group, range]);

  const first = chart?.points[0]?.total;
  const latest = chart?.points.at(-1)?.total;
  const change =
    first !== undefined && latest !== undefined ? latest - first : null;
  const changePct =
    change !== null && first ? (change / Math.abs(first)) * 100 : null;
  const improving =
    change !== null && (group === "debt" ? change <= 0 : change >= 0);
  const Arrow = change !== null && change < 0 ? ArrowDownRight : ArrowUpRight;

  return (
    <Card
      size={compact ? "sm" : "default"}
      className={compact ? "gap-3" : "mb-6 gap-4"}
    >
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className={compact ? "text-sm font-semibold" : "text-lg"}>
            {compact ? "Balance history" : "Net Worth Performance"}
          </CardTitle>
          <SegmentedControl
            label="History period"
            options={RANGES}
            value={range}
            onChange={setRange}
            className="grid auto-cols-fr grid-flow-col"
          />
        </div>
        <Select
          items={GROUPS}
          value={group}
          onValueChange={(value) => value && setGroup(value)}
        >
          <SelectTrigger
            aria-label="Account group"
            size="sm"
            className="w-full rounded-lg text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className="rounded-xl p-1"
          >
            {CASH_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value} className={OPTION_CLASS}>
                {label}
              </SelectItem>
            ))}
            <SelectSeparator className="mx-1 my-1" />
            <SelectGroup aria-label="Investments" className="p-0">
              <SelectItem
                value={ALL_INVESTMENTS.value}
                className={cn(OPTION_CLASS, "font-semibold")}
              >
                {ALL_INVESTMENTS.label}
              </SelectItem>
              <div className="ms-3 border-s border-bento-hairline ps-1">
                {INVESTMENT_OPTIONS.map(({ value, label }) => (
                  <SelectItem
                    key={value}
                    value={value}
                    className={OPTION_CLASS}
                  >
                    {label}
                  </SelectItem>
                ))}
              </div>
            </SelectGroup>
            <SelectSeparator className="mx-1 my-1" />
            {OTHER_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value} className={OPTION_CLASS}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      {error ? (
        <CardContent>
          <p role="alert" className="text-sm text-bento-negative">
            {error}
          </p>
        </CardContent>
      ) : history === null ? (
        <CardContent>
          <Skeleton className={cn("h-64 rounded-xl", compact && "h-40")} />
        </CardContent>
      ) : !chart || chart.points.length < 2 || latest === undefined ? (
        <CardContent className="py-14 text-center text-bento-subtle">
          No balance history for this account type.
        </CardContent>
      ) : (
        <>
          <CardContent className="flex flex-wrap items-end gap-x-4 gap-y-1">
            <p
              className={cn(
                "font-heading text-3xl font-semibold tabular-nums",
                compact && "text-2xl"
              )}
            >
              {formatCurrency(latest, primaryCurrency, true)}
            </p>
            {change !== null && changePct !== null && (
              <p
                className={cn(
                  "mb-1 flex items-center gap-1 text-sm font-medium tabular-nums",
                  compact && "text-xs",
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
            <ChartContainer
              config={CHART_CONFIG}
              className={cn("h-64 w-full", compact && "h-40")}
            >
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
                  tickFormatter={(value) => COMPACT_NUMBER.format(value)}
                  tickLine={false}
                  axisLine={false}
                  width={46}
                />
                <ChartTooltip
                  cursor={{ stroke: "var(--bento-hairline)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <PerformanceTooltip
                        point={payload[0].payload as NetWorthPerformancePoint}
                        group={group}
                        currency={primaryCurrency}
                      />
                    );
                  }}
                />
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
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </>
      )}
    </Card>
  );
}
