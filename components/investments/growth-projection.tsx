"use client";

import { Fragment, useMemo, useState } from "react";
import { Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import type { Transaction } from "@/lib/lunchmoney/client";
import type { CategoryInfo } from "@/lib/lunchmoney/categories";
import { estimateMonthlyContrib } from "@/lib/lunchmoney/analytics";
import { cn } from "@/lib/utils";

// Theme tokens rather than fixed hex: the old slate/amber/green were picked
// for light mode and the slate line all but vanished on dark glass.
const RATES = [
  {
    key: "conservative",
    label: "5% / yr",
    rate: 0.05,
    color: "var(--bento-subtle)",
  },
  { key: "moderate", label: "7% / yr", rate: 0.07, color: "var(--series-1)" },
  {
    key: "optimistic",
    label: "10% / yr",
    rate: 0.1,
    color: "var(--bento-positive)",
  },
] as const;

const chartConfig: ChartConfig = Object.fromEntries(
  RATES.map(({ key, label, color }) => [key, { label, color }])
);

function project(
  initial: number,
  monthlyContrib: number,
  annualRate: number,
  years: number
): number {
  const r = annualRate / 12;
  const n = years * 12;
  const fvLump = initial * Math.pow(1 + r, n);
  const fvContrib =
    r === 0
      ? monthlyContrib * n
      : (monthlyContrib * (Math.pow(1 + r, n) - 1)) / r;
  return fvLump + fvContrib;
}

function axisLabel(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(Math.round(v));
}

const MILESTONES = [10, 20, 30] as const;

const GOAL_PRESETS = [
  { label: "$250K", value: 250_000 },
  { label: "$500K", value: 500_000 },
  { label: "$1M", value: 1_000_000 },
  { label: "$2M", value: 2_000_000 },
  { label: "$5M", value: 5_000_000 },
] as const;

/**
 * Analytically solves for years to reach `goal` given an initial lump sum,
 * monthly contribution, and annual growth rate.
 * Returns 0 if already reached, null if unreachable.
 */
function yearsToGoal(
  initial: number,
  monthly: number,
  annualRate: number,
  goal: number
): number | null {
  if (goal <= 0) return null;
  if (initial >= goal) return 0;

  const r = annualRate / 12;

  if (r === 0) {
    // Pure linear accumulation
    return monthly > 0 ? (goal - initial) / monthly / 12 : null;
  }

  // FV = P*(1+r)^n + C*((1+r)^n - 1)/r
  // Solving for n: n = log((goal*r + C) / (initial*r + C)) / log(1+r)
  const numerator = goal * r + monthly;
  const denominator = initial * r + monthly;

  if (denominator <= 0) return null;

  const months = Math.log(numerator / denominator) / Math.log(1 + r);
  if (!Number.isFinite(months) || months <= 0) return null;
  return months / 12;
}

/** Formats a raw numeric string with thousands commas, no decimals. */
function formatNumber(raw: string): string {
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return raw;
  return Math.round(n).toLocaleString("en-US");
}

function formatGoalYears(years: number | null, baseYear: number): string {
  if (years === null) return "—";
  if (years === 0) return "Already reached";
  if (years > 100) return "> 100 yrs";
  return `${years.toFixed(1)} yrs · by ${baseYear + Math.ceil(years)}`;
}

export function GrowthProjection({
  currentPortfolio,
  primaryCurrency,
  monthlyHistories,
  catMap,
}: {
  currentPortfolio: number;
  primaryCurrency: string;
  monthlyHistories?: Transaction[][];
  catMap?: Map<number, CategoryInfo>;
}) {
  const [monthlyInput, setMonthlyInput] = useState<string>(() => {
    if (typeof window === "undefined") return "0";
    return localStorage.getItem("monthly_contribution") ?? "0";
  });
  const [contribWindow, setContribWindow] = useState<3 | 6>(6);

  const [goalInput, setGoalInput] = useState<string>(() => {
    if (typeof window === "undefined") return "1000000";
    return localStorage.getItem("investment_goal") ?? "1000000";
  });

  const [monthlyFocused, setMonthlyFocused] = useState(false);
  const [goalFocused, setGoalFocused] = useState(false);

  const monthly = useMemo(() => {
    const n = parseFloat(monthlyInput);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [monthlyInput]);

  const estimatedContrib = useMemo(() => {
    if (!monthlyHistories?.length || !catMap) return null;
    const months = Math.min(contribWindow, monthlyHistories.length);
    return estimateMonthlyContrib(monthlyHistories, catMap, months);
  }, [monthlyHistories, catMap, contribWindow]);

  const goal = useMemo(() => {
    const n = parseFloat(goalInput);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [goalInput]);

  // A half-typed value stays on screen but isn't persisted.
  function changeMonthly(raw: string) {
    setMonthlyInput(raw);
    const n = parseFloat(raw);
    if (Number.isFinite(n) && n >= 0) {
      localStorage.setItem("monthly_contribution", String(n));
    }
  }

  function changeGoal(raw: string) {
    setGoalInput(raw);
    const n = parseFloat(raw);
    if (Number.isFinite(n) && n > 0) {
      localStorage.setItem("investment_goal", String(n));
    }
  }

  const currentYear = new Date().getFullYear();

  const chartData = useMemo(
    () =>
      Array.from({ length: 31 }, (_, year) => ({
        year,
        conservative: project(currentPortfolio, monthly, 0.05, year),
        moderate: project(currentPortfolio, monthly, 0.07, year),
        optimistic: project(currentPortfolio, monthly, 0.1, year),
      })),
    [currentPortfolio, monthly]
  );

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Growth Projection</CardTitle>
            <p className="mt-0.5 text-sm text-bento-subtle">
              Starting from{" "}
              <span className="font-mono tabular-nums">
                {formatCurrency(currentPortfolio, primaryCurrency, false)}
              </span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <label className="text-xs text-bento-subtle">
              Monthly contribution
            </label>
            <div className="flex items-center gap-1">
              <span className="font-mono text-sm text-bento-subtle select-none">
                $
              </span>
              <Input
                type="text"
                inputMode="decimal"
                value={
                  monthlyFocused ? monthlyInput : formatNumber(monthlyInput)
                }
                onFocus={() => setMonthlyFocused(true)}
                onBlur={() => setMonthlyFocused(false)}
                onChange={(e) =>
                  changeMonthly(e.target.value.replace(/[^0-9.]/g, ""))
                }
                className="h-8 w-28 text-right font-mono text-sm tabular-nums"
              />
            </div>
            {estimatedContrib !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-bento-subtle">
                  Est.{" "}
                  <span className="tabular-nums">
                    {formatCurrency(
                      Math.round(estimatedContrib),
                      primaryCurrency,
                      false
                    )}
                  </span>
                  /mo
                </span>
                <div className="flex gap-0.5">
                  {([3, 6] as const).map((w) => (
                    <button
                      key={w}
                      onClick={() => setContribWindow(w)}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-xs transition-colors",
                        contribWindow === w
                          ? "bg-bento-muted font-medium text-bento-default"
                          : "text-bento-subtle hover:text-bento-default"
                      )}
                    >
                      {w}mo
                    </button>
                  ))}
                </div>
                <button
                  onClick={() =>
                    changeMonthly(String(Math.round(estimatedContrib)))
                  }
                  className="rounded px-1 py-0.5 text-xs text-bento-brand transition-colors hover:underline active:scale-[0.96]"
                >
                  Use
                </button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-52 w-full">
          <LineChart data={chartData}>
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) =>
                v === 0 ? "Now" : v % 5 === 0 ? `${v}y` : ""
              }
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={axisLabel}
              width={44}
            />
            <ChartTooltip
              cursor={{ stroke: "var(--bento-hairline)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-xl glass px-2.5 py-1.5 text-xs">
                    <p className="mb-1 text-bento-subtle">
                      {label === 0 ? "Today" : `Year ${label}`}
                    </p>
                    {RATES.map(({ key, label: rateLabel, color }) => {
                      const entry = payload.find((p) => p.dataKey === key);
                      if (!entry) return null;
                      return (
                        <p
                          key={key}
                          className="flex items-center gap-2 tabular-nums"
                        >
                          <span
                            className="size-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-bento-subtle">{rateLabel}</span>
                          <span className="ml-auto font-medium">
                            {formatCurrency(
                              Number(entry.value),
                              primaryCurrency
                            )}
                          </span>
                        </p>
                      );
                    })}
                  </div>
                );
              }}
            />
            {RATES.map(({ key, color }) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ChartContainer>

        {/* Milestone table */}
        <div className="mt-5 grid grid-cols-4 gap-x-3 gap-y-1.5 text-xs">
          <div />
          {MILESTONES.map((yr) => (
            <div
              key={yr}
              className="text-center font-semibold tracking-wide text-bento-subtle uppercase"
            >
              Year {yr}
            </div>
          ))}
          {RATES.map(({ key, label, rate, color }) => (
            <Fragment key={key}>
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block h-1.5 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-bento-subtle">{label}</span>
              </div>
              {MILESTONES.map((yr) => (
                <div key={yr} className="text-center font-mono tabular-nums">
                  {formatCurrency(
                    project(currentPortfolio, monthly, rate, yr),
                    primaryCurrency,
                    false
                  )}
                </div>
              ))}
            </Fragment>
          ))}
        </div>

        {/* Goal planner */}
        <div className="mt-5 border-t border-bento-hairline pt-5">
          <div className="mb-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold tracking-wide text-bento-subtle uppercase">
                Goal planner
              </p>
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs text-bento-subtle select-none">
                  $
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={goalFocused ? goalInput : formatNumber(goalInput)}
                  onFocus={() => setGoalFocused(true)}
                  onBlur={() => setGoalFocused(false)}
                  onChange={(e) =>
                    changeGoal(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  className="h-7 w-28 text-right font-mono text-xs tabular-nums"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-0.5">
              {GOAL_PRESETS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => changeGoal(String(value))}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-xs transition-colors",
                    goal === value
                      ? "bg-bento-muted font-medium text-bento-default"
                      : "text-bento-subtle hover:text-bento-default"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {goal !== null && (
            <div className="space-y-1.5 text-xs">
              {RATES.map(({ key, label, rate, color }) => {
                const years = yearsToGoal(
                  currentPortfolio,
                  monthly,
                  rate,
                  goal
                );
                return (
                  <div
                    key={key}
                    className="flex items-baseline justify-between gap-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-1.5 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-bento-subtle">{label}</span>
                    </div>
                    <span className="font-mono tabular-nums">
                      {formatGoalYears(years, currentYear)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
