"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { MONTH_NAMES } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Transaction } from "@/lib/lunchmoney/client";
import type { CategoryInfo } from "@/lib/lunchmoney/categories";
import type { QuickStats } from "@/hooks/use-dashboard-data";

type StatPanel = "income" | "spend" | "peak";

/**
 * The four summary stat cards (Income, Spend, Avg/Day, Peak Day) plus the
 * drill-down panel that appears when you click one of them.
 *
 * "use client" is needed because this component manages openPanel state and
 * handles click events.
 *
 * Note: the parent passes a `key` prop equal to `${year}-${month}`. When the
 * month changes, React sees a different key and completely remounts this
 * component — which automatically resets openPanel back to null. This is the
 * idiomatic React way to reset component state in response to a prop change,
 * without adding a useEffect.
 */
export function QuickStatsPanel({
  quickStats,
  primaryCurrency,
  incomePanelTxs,
  sortedSpendTxs,
  peakDayPanelTxs,
  categoryMap,
  selectedMonth,
  loading,
}: {
  quickStats: QuickStats | null;
  primaryCurrency: string;
  incomePanelTxs: Transaction[];
  sortedSpendTxs: Transaction[];
  peakDayPanelTxs: Transaction[];
  categoryMap: Map<number, CategoryInfo>;
  selectedMonth: number;
  loading: boolean;
}) {
  const [openPanel, setOpenPanel] = useState<StatPanel | null>(null);

  return (
    <>
      {/* 4-card grid */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))
        ) : quickStats ? (
          <>
            <Card
              className={cn(
                "cursor-pointer transition-[transform,box-shadow] hover:shadow-md active:scale-[0.98]",
                openPanel === "income" && "ring-2 ring-green-500/50"
              )}
              onClick={() =>
                setOpenPanel((p) => (p === "income" ? null : "income"))
              }
            >
              <CardHeader>
                <CardTitle className="text-4xl text-green-500 tabular-nums">
                  {formatCurrency(
                    quickStats.totalIncome,
                    primaryCurrency,
                    false
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium tracking-wide text-muted-foreground">
                  Income{" "}
                  <span className="font-mono text-[11px] text-muted-foreground/50">
                    ({incomePanelTxs.length} deposits)
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card
              className={cn(
                "cursor-pointer transition-[transform,box-shadow] hover:shadow-md active:scale-[0.98]",
                openPanel === "spend" && "ring-2 ring-rose-500/50"
              )}
              onClick={() =>
                setOpenPanel((p) => (p === "spend" ? null : "spend"))
              }
            >
              <CardHeader>
                <CardTitle className="text-4xl text-rose-500 tabular-nums">
                  {formatCurrency(
                    quickStats.totalSpend,
                    primaryCurrency,
                    false
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium tracking-wide text-muted-foreground">
                  Spend{" "}
                  <span className="font-mono text-[11px] text-muted-foreground/50">
                    ({sortedSpendTxs.length} transactions)
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-4xl text-blue-500 tabular-nums">
                  {formatCurrency(
                    quickStats.avgSpendPerDay,
                    primaryCurrency,
                    false
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium tracking-wide text-muted-foreground">
                  Avg / Day{" "}
                  <span className="font-mono text-[11px] text-muted-foreground/50">
                    (this {MONTH_NAMES[selectedMonth - 1].toLowerCase()})
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card
              className={cn(
                "cursor-pointer transition-[transform,box-shadow] hover:shadow-md active:scale-[0.98]",
                openPanel === "peak" && "ring-2 ring-amber-500/50"
              )}
              onClick={() =>
                setOpenPanel((p) => (p === "peak" ? null : "peak"))
              }
            >
              <CardHeader>
                <CardTitle className="text-4xl text-amber-500 tabular-nums">
                  {formatCurrency(
                    quickStats.peakAmount,
                    primaryCurrency,
                    false
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium tracking-wide text-muted-foreground">
                  Peak Day{" "}
                  <span className="font-mono text-[11px] text-muted-foreground/50">
                    (
                    {quickStats.peakDay
                      ? formatShortDate(quickStats.peakDay)
                      : "—"}
                    )
                  </span>
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Drill-down panel */}
      {!loading && openPanel && quickStats && (
        <div className="mb-4 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">
              {openPanel === "income" && "Income Transactions"}
              {openPanel === "spend" && "Spend Transactions"}
              {openPanel === "peak" &&
                `Peak Day — ${formatShortDate(quickStats.peakDay)}`}
            </span>
            <button
              onClick={() => setOpenPanel(null)}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <ul className="divide-y divide-border">
            {(openPanel === "income"
              ? incomePanelTxs
              : openPanel === "spend"
                ? sortedSpendTxs
                : peakDayPanelTxs
            ).map((tx) => {
              const catName =
                tx.category_id != null
                  ? (categoryMap.get(tx.category_id)?.name ?? "—")
                  : "—";
              const amt = parseFloat(tx.amount);
              const isIncome = amt < 0;
              return (
                <li
                  key={tx.id}
                  className="flex items-center gap-4 px-4 py-2.5 text-xs"
                >
                  <span className="w-14 shrink-0 font-mono text-muted-foreground">
                    {formatShortDate(tx.date)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {tx.payee}
                  </span>
                  {!isIncome && (
                    <span className="shrink-0 text-muted-foreground">
                      {catName}
                    </span>
                  )}
                  <span
                    className={cn(
                      "shrink-0 font-mono tabular-nums",
                      isIncome
                        ? "text-green-600 dark:text-green-400"
                        : "text-foreground"
                    )}
                  >
                    {isIncome ? "+" : ""}
                    {formatCurrency(Math.abs(amt), primaryCurrency, true)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
