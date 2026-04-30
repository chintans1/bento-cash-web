"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { MONTH_NAMES } from "@/lib/date-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type { Transaction } from "@/lib/lunchmoney/client";
import type { CategoryInfo } from "@/lib/lunchmoney/categories";
import type { QuickStats } from "@/lib/lunchmoney/analytics";

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
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-bento-muted"
            />
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
              <CardContent className="flex flex-col gap-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-bento-subtle">
                  Income
                </p>
                <p className="text-3xl font-bold leading-none text-green-500 tabular-nums">
                  {formatCurrency(
                    quickStats.totalIncome,
                    primaryCurrency,
                    false
                  )}
                </p>
                <p className="font-mono text-xs text-bento-subtle/60">
                  {incomePanelTxs.length} deposits
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
              <CardContent className="flex flex-col gap-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-bento-subtle">
                  Spend
                </p>
                <p className="text-3xl font-bold leading-none text-rose-500 tabular-nums">
                  {formatCurrency(
                    quickStats.totalSpend,
                    primaryCurrency,
                    false
                  )}
                </p>
                <p className="font-mono text-xs text-bento-subtle/60">
                  {sortedSpendTxs.length} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-bento-subtle">
                  Avg / Day
                </p>
                <p className="text-3xl font-bold leading-none text-blue-500 tabular-nums">
                  {formatCurrency(
                    quickStats.avgSpendPerDay,
                    primaryCurrency,
                    false
                  )}
                </p>
                <p className="font-mono text-xs text-bento-subtle/60">
                  {MONTH_NAMES[selectedMonth - 1]}
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
              <CardContent className="flex flex-col gap-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-bento-subtle">
                  Peak Day
                </p>
                <p className="text-3xl font-bold leading-none text-amber-500 tabular-nums">
                  {formatCurrency(
                    quickStats.peakAmount,
                    primaryCurrency,
                    false
                  )}
                </p>
                <p className="font-mono text-xs text-bento-subtle/60">
                  {quickStats.peakDay
                    ? formatShortDate(quickStats.peakDay)
                    : "—"}
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Drill-down panel */}
      {!loading && openPanel && quickStats && (
        <div className="mb-4 animate-in slide-in-from-top-1 duration-150 rounded-xl border border-bento-hairline bg-bento-surface">
          <div className="flex items-center justify-between border-b border-bento-hairline px-4 py-3">
            <span className="text-sm font-semibold">
              {openPanel === "income" && "Income Transactions"}
              {openPanel === "spend" && "Spend Transactions"}
              {openPanel === "peak" &&
                `Peak Day — ${formatShortDate(quickStats.peakDay)}`}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpenPanel(null)}
              className="text-bento-subtle hover:text-bento-default"
            >
              <X className="size-3.5" />
            </Button>
          </div>
          <Table>
            <TableBody>
              {(openPanel === "income"
                ? incomePanelTxs
                : openPanel === "spend"
                  ? sortedSpendTxs
                  : peakDayPanelTxs
              ).map((tx) => {
                const catName =
                  tx.category_id != null
                    ? (categoryMap.get(tx.category_id)?.name ?? "Uncategorized")
                    : "Uncategorized";
                const isCategorized =
                  tx.category_id != null && categoryMap.has(tx.category_id);
                const amt = parseFloat(tx.amount);
                const isIncome = amt < 0;
                return (
                  <TableRow key={tx.id}>
                    <TableCell className="w-14 font-mono text-xs text-bento-subtle">
                      {formatShortDate(tx.date)}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {tx.payee}
                    </TableCell>
                    <TableCell className="w-28 text-right text-xs">
                      {!isIncome && (
                        <span
                          className={
                            isCategorized
                              ? "text-bento-subtle"
                              : "text-amber-600 dark:text-amber-400"
                          }
                        >
                          {catName}
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "w-24 text-right font-mono text-xs tabular-nums",
                        isIncome
                          ? "text-green-600 dark:text-green-400"
                          : "text-bento-default"
                      )}
                    >
                      {isIncome ? "+" : ""}
                      {formatCurrency(Math.abs(amt), primaryCurrency, true)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
