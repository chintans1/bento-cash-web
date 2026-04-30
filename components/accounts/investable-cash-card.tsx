"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
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
            className="text-xs text-bento-subtle underline-offset-4 hover:text-bento-default hover:underline"
          >
            Adjust target
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.status === "idle" || state.status === "loading" ? (
          <div className="space-y-3">
            <div className="h-9 w-40 animate-pulse rounded-lg bg-bento-muted" />
            <div className="h-5 w-full animate-pulse rounded bg-bento-muted" />
            <div className="h-5 w-full animate-pulse rounded bg-bento-muted" />
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
                    ? "text-green-600 dark:text-green-400"
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
              {(() => {
                const surplus = Math.max(
                  0,
                  state.totalCheckingBalance - state.checkingFloor
                );
                const ok = state.totalCheckingBalance >= state.checkingFloor;
                return (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2">
                      {ok ? (
                        <Check className="size-3.5 shrink-0 text-green-600 dark:text-green-400" />
                      ) : (
                        <X className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      )}
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
                            ? "text-bento-default"
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
                  {state.savingsFunded ? (
                    <Check className="size-3.5 shrink-0 text-green-600 dark:text-green-400" />
                  ) : (
                    <X className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  )}
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
