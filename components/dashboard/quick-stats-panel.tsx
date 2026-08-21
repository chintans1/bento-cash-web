"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { AnimatedCollapse } from "@/components/animated-collapse";
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
/**
 * One stat tile. Clickable tiles open the drill-down panel below the grid;
 * Avg/day has nothing to drill into, so it renders without a click handler.
 */
function StatTile({
  label,
  value,
  hint,
  accent,
  open,
  onClick,
}: {
  label: string;
  value: string;
  hint: string;
  accent: string;
  open?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      size="sm"
      onClick={onClick}
      className={cn(
        "gap-2",
        onClick &&
          "cursor-pointer transition-[transform,box-shadow] hover:shadow-md active:scale-[0.98]",
        open && "ring-2 ring-bento-brand/60"
      )}
    >
      <CardContent>
        <div className="flex items-center gap-1.5">
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: accent }}
          />
          <p className="text-[11px] font-medium tracking-[0.12em] text-bento-subtle uppercase">
            {label}
          </p>
        </div>
        <p className="mt-1.5 font-heading text-2xl font-semibold tabular-nums sm:text-3xl">
          {value}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-bento-subtle">{hint}</p>
      </CardContent>
    </Card>
  );
}

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
              className="h-24 animate-pulse rounded-4xl bg-bento-muted"
            />
          ))
        ) : quickStats ? (
          <>
            <StatTile
              label="Income"
              value={formatCurrency(quickStats.totalIncome, primaryCurrency)}
              hint={`${incomePanelTxs.length} deposits`}
              accent="var(--bento-positive)"
              open={openPanel === "income"}
              onClick={() =>
                setOpenPanel((p) => (p === "income" ? null : "income"))
              }
            />
            <StatTile
              label="Spend"
              value={formatCurrency(quickStats.totalSpend, primaryCurrency)}
              hint={`${sortedSpendTxs.length} transactions`}
              accent="var(--chart-1)"
              open={openPanel === "spend"}
              onClick={() =>
                setOpenPanel((p) => (p === "spend" ? null : "spend"))
              }
            />
            <StatTile
              label="Avg / day"
              value={formatCurrency(quickStats.avgSpendPerDay, primaryCurrency)}
              hint={`This ${MONTH_NAMES[selectedMonth - 1]}`}
              accent="var(--cat-1)"
            />
            <StatTile
              label="Peak day"
              value={formatCurrency(quickStats.peakAmount, primaryCurrency)}
              hint={`${
                quickStats.peakDay ? formatShortDate(quickStats.peakDay) : "—"
              } · excl. recurring`}
              accent="var(--cat-2)"
              open={openPanel === "peak"}
              onClick={() =>
                setOpenPanel((p) => (p === "peak" ? null : "peak"))
              }
            />
          </>
        ) : null}
      </div>

      {/* Drill-down panel */}
      <AnimatedCollapse
        open={!loading && !!openPanel && !!quickStats}
        className="mb-4"
      >
        {openPanel && quickStats && (
          <div className="rounded-4xl border border-bento-hairline bg-bento-surface">
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
                      ? (categoryMap.get(tx.category_id)?.name ??
                        "Uncategorized")
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
                                : "text-bento-brand"
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
                            ? "text-bento-positive"
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
      </AnimatedCollapse>
    </>
  );
}
