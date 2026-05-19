"use client";

import { Fragment, useMemo, useState } from "react";
import { Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";

const RATES = [
  { key: "conservative", label: "5% / yr", rate: 0.05, color: "#64748b" },
  { key: "moderate", label: "7% / yr", rate: 0.07, color: "#f59e0b" },
  { key: "optimistic", label: "10% / yr", rate: 0.10, color: "#22c55e" },
] as const;

const chartConfig = {
  conservative: { label: "5% / yr", color: "#64748b" },
  moderate: { label: "7% / yr", color: "#f59e0b" },
  optimistic: { label: "10% / yr", color: "#22c55e" },
} satisfies ChartConfig;

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
    r === 0 ? monthlyContrib * n : (monthlyContrib * (Math.pow(1 + r, n) - 1)) / r;
  return fvLump + fvContrib;
}

function axisLabel(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(Math.round(v));
}

const MILESTONES = [10, 20, 30] as const;

export function GrowthProjection({
  currentPortfolio,
  primaryCurrency,
}: {
  currentPortfolio: number;
  primaryCurrency: string;
}) {
  const [monthlyInput, setMonthlyInput] = useState<string>(() => {
    if (typeof window === "undefined") return "0";
    return localStorage.getItem("monthly_contribution") ?? "0";
  });

  const monthly = useMemo(() => {
    const n = parseFloat(monthlyInput);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [monthlyInput]);

  function handleChange(raw: string) {
    setMonthlyInput(raw);
    const n = parseFloat(raw);
    if (Number.isFinite(n) && n >= 0) {
      localStorage.setItem("monthly_contribution", String(n));
    }
  }

  const chartData = useMemo(
    () =>
      Array.from({ length: 31 }, (_, year) => ({
        year,
        conservative: project(currentPortfolio, monthly, 0.05, year),
        moderate: project(currentPortfolio, monthly, 0.07, year),
        optimistic: project(currentPortfolio, monthly, 0.10, year),
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
              Monthly contribution ({primaryCurrency.toUpperCase()})
            </label>
            <Input
              type="number"
              min={0}
              step={100}
              value={monthlyInput}
              onChange={(e) => handleChange(e.target.value)}
              className="h-8 w-32 text-right font-mono text-sm tabular-nums"
            />
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
              content={
                <ChartTooltipContent
                  labelFormatter={(v) => (v === 0 ? "Today" : `Year ${v}`)}
                  formatter={(value, name) => {
                    const rate = RATES.find((r) => r.key === name);
                    return (
                      <>
                        <div
                          className="h-2 w-2 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: rate?.color }}
                        />
                        <div className="flex flex-1 justify-between gap-4">
                          <span className="text-muted-foreground">
                            {rate?.label}
                          </span>
                          <span className="font-mono font-medium tabular-nums">
                            {formatCurrency(
                              Number(value),
                              primaryCurrency,
                              false
                            )}
                          </span>
                        </div>
                      </>
                    );
                  }}
                />
              }
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
                <div
                  key={yr}
                  className="text-center font-mono tabular-nums"
                >
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
      </CardContent>
    </Card>
  );
}
