"use client";

import { useEffect, useState } from "react";
import { useToken } from "@/hooks/use-token";
import {
  getAccounts,
  getCategories,
  getMe,
  getTransactionsForMonth,
} from "@/lib/lunchmoney/client";
import { buildCategoryMap } from "@/lib/lunchmoney/analytics";
import {
  normalizeManual,
  normalizePlaid,
  type NormalizedAccount,
} from "@/lib/account-utils";
import {
  computeAllocation,
  computeFIREMetrics,
  computeMonthlySummary,
  projectNetWorth,
  type AllocationSlice,
  type FIREMetrics,
  type MonthlySummary,
  type ProjectionPoint,
} from "@/lib/lunchmoney/wealth-analytics";
import { NoTokenPrompt } from "@/components/no-token-prompt";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GrowthProjectionChart } from "@/components/wealth/growth-projection-chart";
import { AllocationBar } from "@/components/wealth/allocation-bar";
import { CashFlowChart } from "@/components/wealth/cash-flow-chart";
import { FIRECard } from "@/components/wealth/fire-card";
import { cn } from "@/lib/utils";

const HORIZON_OPTIONS = [10, 20, 30] as const;
type Horizon = (typeof HORIZON_OPTIONS)[number];

function getLastNMonths(
  n: number,
  now: Date
): Array<{ year: number; month: number }> {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }).reverse();
}

type PageState =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      netWorth: number;
      accounts: NormalizedAccount[];
      primaryCurrency: string;
      allocation: AllocationSlice[];
      monthlySummaries: MonthlySummary[];
      fireMetrics: FIREMetrics;
      defaultMonthlyContribution: number;
    };

export default function WealthPage() {
  const { token } = useToken();
  const [state, setState] = useState<PageState>({ status: "idle" });

  // User-adjustable projection inputs
  const [monthlyContribution, setMonthlyContribution] = useState<number>(0);
  const [contributionInput, setContributionInput] = useState("0");
  const [horizon, setHorizon] = useState<Horizon>(30);

  useEffect(() => {
    if (!token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: "loading" });

    const now = new Date();
    const months = getLastNMonths(6, now);

    Promise.all([
      getMe(token),
      getAccounts(token),
      getCategories(token),
      Promise.all(
        months.map(({ year, month }) =>
          getTransactionsForMonth(token, year, month)
        )
      ),
    ])
      .then(([user, { manual, plaid }, catRes, txResults]) => {
        const catMap = buildCategoryMap(catRes);
        const accounts: NormalizedAccount[] = [
          ...manual.map(normalizeManual),
          ...plaid.map(normalizePlaid),
        ];

        const assets = accounts.filter(
          (a) => !a.isLiability && a.status !== "closed"
        );
        const liabilities = accounts.filter(
          (a) => a.isLiability && a.status !== "closed"
        );
        const totalAssets = assets.reduce(
          (s, a) => s + (a.balanceValid ? a.toBase : 0),
          0
        );
        const totalLiabilities = liabilities.reduce(
          (s, a) => s + (a.balanceValid ? a.toBase : 0),
          0
        );
        const netWorth = totalAssets - totalLiabilities;

        const monthlySummaries: MonthlySummary[] = months.map(
          ({ year, month }, i) =>
            computeMonthlySummary(
              txResults[i].transactions,
              catMap,
              year,
              month
            )
        );

        const allocation = computeAllocation(accounts);
        const fireMetrics = computeFIREMetrics(netWorth, monthlySummaries);

        const defaultContribution = Math.round(fireMetrics.monthlySavings);

        setState({
          status: "ready",
          netWorth,
          accounts,
          primaryCurrency: user.primary_currency,
          allocation,
          monthlySummaries,
          fireMetrics,
          defaultMonthlyContribution: defaultContribution,
        });

        setMonthlyContribution(defaultContribution);
        setContributionInput(String(defaultContribution));
      })
      .catch((err) =>
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Failed to load data",
        })
      );
  }, [token]);

  if (!token) return <NoTokenPrompt />;

  const isLoading = state.status === "idle" || state.status === "loading";

  const ready = state.status === "ready" ? state : null;

  const projectionData: ProjectionPoint[] = ready
    ? projectNetWorth(ready.netWorth, monthlyContribution, horizon)
    : [];

  return (
    <div className="mx-auto max-w-6xl px-6 pt-6 pb-10">
      {/* Hero */}
      <div className="mb-8 text-center">
        <p className="mb-1 text-sm text-muted-foreground">Net Worth</p>
        {isLoading ? (
          <div className="mx-auto h-12 w-64 animate-pulse rounded-lg bg-muted" />
        ) : state.status === "error" ? (
          <p className="text-sm text-destructive">{state.message}</p>
        ) : (
          <p className="font-heading text-5xl font-bold">
            {formatCurrency(ready!.netWorth, ready!.primaryCurrency, true)}
          </p>
        )}
      </div>

      {state.status === "error" ? null : (
        <>
          {/* Growth Projection */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Growth Projection</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Conservative 4% · Moderate 7% · Aggressive 10%
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {/* Monthly contribution input */}
                  <label className="flex items-center gap-1.5 text-sm">
                    <span className="text-muted-foreground">Monthly +</span>
                    <div className="flex items-center rounded-md border border-border bg-background px-2 py-1">
                      <span className="text-xs text-muted-foreground">$</span>
                      <input
                        type="number"
                        min={0}
                        value={contributionInput}
                        onChange={(e) => {
                          setContributionInput(e.target.value);
                          const n = parseFloat(e.target.value);
                          if (!isNaN(n) && n >= 0) setMonthlyContribution(n);
                        }}
                        className="w-20 bg-transparent text-right text-sm tabular-nums outline-none"
                      />
                    </div>
                  </label>
                  {/* Horizon selector */}
                  <div className="flex rounded-md border border-border">
                    {HORIZON_OPTIONS.map((yr) => (
                      <button
                        key={yr}
                        onClick={() => setHorizon(yr)}
                        className={cn(
                          "px-3 py-1 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md",
                          horizon === yr
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {yr}yr
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-52 animate-pulse rounded-lg bg-muted" />
              ) : (
                <GrowthProjectionChart
                  data={projectionData}
                  primaryCurrency={ready!.primaryCurrency}
                />
              )}
            </CardContent>
          </Card>

          {/* Allocation + FIRE side by side */}
          <div className="mb-6 grid grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Portfolio Allocation</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Assets only · excludes liabilities
                </p>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-40 animate-pulse rounded-lg bg-muted" />
                ) : (
                  <AllocationBar
                    slices={ready!.allocation}
                    primaryCurrency={ready!.primaryCurrency}
                  />
                )}
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="h-52 animate-pulse rounded-xl bg-muted" />
            ) : (
              <FIRECard
                metrics={ready!.fireMetrics}
                primaryCurrency={ready!.primaryCurrency}
              />
            )}
          </div>

          {/* Monthly Cash Flow */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Monthly Cash Flow</CardTitle>
              <p className="text-xs text-muted-foreground">Last 6 months</p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-44 animate-pulse rounded-lg bg-muted" />
              ) : (
                <CashFlowChart
                  data={ready!.monthlySummaries}
                  primaryCurrency={ready!.primaryCurrency}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
