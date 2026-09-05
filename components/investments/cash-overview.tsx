"use client";

import { type NormalizedAccount, sumBalances } from "@/lib/account-utils";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export function CashOverview({
  checkingAccounts,
  savingsAccounts,
  primaryCurrency,
  avgMonthlySpend,
}: {
  checkingAccounts: NormalizedAccount[];
  savingsAccounts: NormalizedAccount[];
  primaryCurrency: string;
  avgMonthlySpend: number | null;
}) {
  if (checkingAccounts.length === 0 && savingsAccounts.length === 0) {
    return null;
  }

  const checkingTotal = sumBalances(checkingAccounts);
  const savingsTotal = sumBalances(savingsAccounts);
  const totalCash = checkingTotal + savingsTotal;

  const checkingPct = totalCash > 0 ? (checkingTotal / totalCash) * 100 : 50;
  const savingsPct = 100 - checkingPct;
  const emergencyMonths =
    avgMonthlySpend && avgMonthlySpend > 0 ? totalCash / avgMonthlySpend : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-lg">Liquid Cash</CardTitle>
          <span className="font-mono text-sm font-medium tabular-nums">
            {formatCurrency(totalCash, primaryCurrency, true)}
          </span>
        </div>
        {emergencyMonths !== null && (
          <CardDescription>
            ~{emergencyMonths.toFixed(1)} months emergency fund
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {checkingTotal > 0 && savingsTotal > 0 && (
          <div className="flex h-2 w-full overflow-hidden rounded-full">
            <div
              className="h-full bg-cat-1 transition-[width]"
              style={{ width: `${checkingPct}%` }}
            />
            <div
              className="h-full bg-cat-2 transition-[width]"
              style={{ width: `${savingsPct}%` }}
            />
          </div>
        )}

        {checkingTotal > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 shrink-0 rounded-full bg-cat-1" />
                <span className="text-sm text-bento-subtle">Checking</span>
              </div>
              <span className="font-mono text-sm font-medium tabular-nums">
                {formatCurrency(checkingTotal, primaryCurrency, true)}
              </span>
            </div>
            {checkingAccounts.length > 1 && (
              <ul className="ml-4 space-y-1">
                {checkingAccounts.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-baseline justify-between gap-2 text-xs text-bento-subtle"
                  >
                    <span className="min-w-0 truncate">{a.name}</span>
                    <span className="shrink-0 font-mono tabular-nums">
                      {a.balanceValid
                        ? formatCurrency(a.toBase, primaryCurrency, true)
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {savingsTotal > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 shrink-0 rounded-full bg-cat-2" />
                <span className="text-sm text-bento-subtle">Savings</span>
              </div>
              <span className="font-mono text-sm font-medium tabular-nums">
                {formatCurrency(savingsTotal, primaryCurrency, true)}
              </span>
            </div>
            {savingsAccounts.length > 1 && (
              <ul className="ml-4 space-y-1">
                {savingsAccounts.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-baseline justify-between gap-2 text-xs text-bento-subtle"
                  >
                    <span className="min-w-0 truncate">{a.name}</span>
                    <span className="shrink-0 font-mono tabular-nums">
                      {a.balanceValid
                        ? formatCurrency(a.toBase, primaryCurrency, true)
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
