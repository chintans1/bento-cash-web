"use client";

import Link from "next/link";
import { type InvestableState } from "@/lib/investable-utils";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function InvestableCashCard({
  state,
  primaryCurrency,
}: {
  state: InvestableState;
  primaryCurrency: string;
}) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-lg">Investable Cash</CardTitle>
          <Link
            href="/settings"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Adjust target
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.status === "idle" || state.status === "loading" ? (
          <div className="space-y-3">
            <div className="h-9 w-40 animate-pulse rounded-lg bg-muted" />
            <div className="h-5 w-full animate-pulse rounded bg-muted" />
            <div className="h-5 w-full animate-pulse rounded bg-muted" />
          </div>
        ) : state.status === "error" ? (
          <p className="text-sm text-muted-foreground">
            Could not compute — {state.message}
          </p>
        ) : (
          <>
            <div>
              <p
                className={cn(
                  "font-mono text-3xl font-bold tabular-nums",
                  state.investableAmount > 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground"
                )}
              >
                {formatCurrency(state.investableAmount, primaryCurrency, true)}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {state.investableAmount > 0
                  ? "ready to invest"
                  : state.savingsFunded
                    ? "checking is at its floor"
                    : "fund your savings first"}
              </p>
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              {(() => {
                const surplus = Math.max(
                  0,
                  state.totalCheckingBalance - state.checkingFloor
                );
                const ok = state.totalCheckingBalance >= state.checkingFloor;
                return (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "text-sm",
                          ok
                            ? "text-green-600 dark:text-green-400"
                            : "text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {ok ? "✓" : "✗"}
                      </span>
                      <span className="truncate text-sm text-muted-foreground">
                        Checking buffer (1mo)
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-sm text-muted-foreground tabular-nums">
                      {formatCurrency(
                        state.totalCheckingBalance,
                        primaryCurrency,
                        true
                      )}
                      {" − "}
                      {formatCurrency(
                        state.checkingFloor,
                        primaryCurrency,
                        true
                      )}
                      {" = "}
                      <span
                        className={cn(
                          "font-medium",
                          ok
                            ? "text-foreground"
                            : "text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {formatCurrency(surplus, primaryCurrency, true)}
                      </span>
                    </span>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "text-sm",
                      state.savingsFunded
                        ? "text-green-600 dark:text-green-400"
                        : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {state.savingsFunded ? "✓" : "✗"}
                  </span>
                  <span className="truncate text-sm text-muted-foreground">
                    Emergency fund ({state.savingsMonths}mo)
                  </span>
                </div>
                <span className="shrink-0 font-mono text-sm text-muted-foreground tabular-nums">
                  {formatCurrency(
                    state.totalSavingsBalance,
                    primaryCurrency,
                    true
                  )}
                  {" / "}
                  <span
                    className={cn(
                      "font-medium",
                      state.savingsFunded
                        ? "text-foreground"
                        : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {formatCurrency(state.savingsTarget, primaryCurrency, true)}
                  </span>
                  {!state.savingsFunded && (
                    <span className="text-amber-600 dark:text-amber-400">
                      {" (−"}
                      {formatCurrency(
                        state.savingsShortfall,
                        primaryCurrency,
                        true
                      )}
                      {")"}
                    </span>
                  )}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              avg{" "}
              {formatCurrency(state.avgMonthlySpend, primaryCurrency, false)}/mo
              · last 3 months
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
