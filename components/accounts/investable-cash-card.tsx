"use client";

import Link from "next/link";
import { type InvestableState } from "@/lib/investable-utils";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function InvestableCashCard({
  state,
  primaryCurrency,
}: {
  state: InvestableState;
  primaryCurrency: string;
}) {
  const ready = state.status === "ready" ? state : null;
  const checkingOk =
    !!ready && ready.totalCheckingBalance >= ready.checkingFloor;
  const checkingSurplus = ready
    ? Math.max(0, ready.totalCheckingBalance - ready.checkingFloor)
    : 0;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-lg">Investable Cash</CardTitle>
          <Link
            href="/settings"
            className="text-xs text-bento-subtle underline-offset-4 hover:text-bento-default hover:underline"
          >
            Adjust target
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.status === "loading" ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-40 rounded-lg" />
            <Skeleton className="h-5 w-full rounded" />
            <Skeleton className="h-5 w-full rounded" />
          </div>
        ) : state.status === "error" ? (
          <p className="text-sm text-bento-subtle">
            Could not compute — {state.message}
          </p>
        ) : (
          <>
            <div>
              <p
                className={cn(
                  "font-mono text-3xl font-bold tabular-nums",
                  state.investableAmount > 0
                    ? "text-bento-positive"
                    : "text-bento-subtle"
                )}
              >
                {formatCurrency(state.investableAmount, primaryCurrency, true)}
              </p>
              <p className="mt-0.5 text-sm text-bento-subtle">
                {state.investableAmount > 0
                  ? "ready to invest"
                  : state.savingsFunded
                    ? "checking is at its floor"
                    : "fund your savings first"}
              </p>
            </div>

            <div className="space-y-2 border-t border-bento-hairline pt-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "text-sm",
                      checkingOk ? "text-bento-positive" : "text-bento-brand"
                    )}
                  >
                    {checkingOk ? "✓" : "✗"}
                  </span>
                  <span className="truncate text-sm text-bento-subtle">
                    Checking buffer (1mo)
                  </span>
                </div>
                <span className="shrink-0 font-mono text-sm text-bento-subtle tabular-nums">
                  {formatCurrency(
                    state.totalCheckingBalance,
                    primaryCurrency,
                    true
                  )}
                  {" − "}
                  {formatCurrency(state.checkingFloor, primaryCurrency, true)}
                  {" = "}
                  <span
                    className={cn(
                      "font-medium",
                      checkingOk ? "text-bento-default" : "text-bento-brand"
                    )}
                  >
                    {formatCurrency(checkingSurplus, primaryCurrency, true)}
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "text-sm",
                      state.savingsFunded
                        ? "text-bento-positive"
                        : "text-bento-brand"
                    )}
                  >
                    {state.savingsFunded ? "✓" : "✗"}
                  </span>
                  <span className="truncate text-sm text-bento-subtle">
                    Emergency fund ({state.savingsMonths}mo)
                  </span>
                </div>
                <span className="shrink-0 font-mono text-sm text-bento-subtle tabular-nums">
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
                        ? "text-bento-default"
                        : "text-bento-brand"
                    )}
                  >
                    {formatCurrency(state.savingsTarget, primaryCurrency, true)}
                  </span>
                  {!state.savingsFunded && (
                    <span className="text-bento-brand">
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

            <p className="text-xs text-bento-subtle">
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
