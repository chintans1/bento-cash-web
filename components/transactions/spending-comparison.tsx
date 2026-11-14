import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import {
  formatMonthKey,
  MONTH_NAMES,
  monthKeyOf,
  spendingComparisonPeriod,
} from "@/lib/date-utils";
import { formatCurrency } from "@/lib/format";
import { computeTransactionSummary } from "@/lib/lunchmoney/analytics";
import type { CategoryInfo } from "@/lib/lunchmoney/categories";
import {
  getTransactionsForMonth,
  type Transaction,
} from "@/lib/lunchmoney/client";

export function SpendingComparison({
  year,
  month,
  transactions,
  categoryMap,
  primaryCurrency,
  monthlySpend,
}: {
  year: number;
  month: number;
  transactions: Transaction[];
  categoryMap: Map<number, CategoryInfo>;
  primaryCurrency: string;
  monthlySpend: number;
}) {
  const { previous, days, currentThrough, previousThrough } =
    spendingComparisonPeriod(year, month, new Date());
  const { year: previousYear, month: previousMonth } = previous;
  const [previousTransactions, setPreviousTransactions] =
    useState<Transaction[]>();

  useEffect(() => {
    let active = true;
    void getTransactionsForMonth(previousYear, previousMonth).then(
      ({ transactions, has_more }) => {
        if (active && !has_more && transactions.length > 0)
          setPreviousTransactions(transactions);
      },
      () => {
        // The month summary remains usable when comparison data is unavailable.
      }
    );
    return () => {
      active = false;
    };
  }, [previousYear, previousMonth]);

  const currentSpend = useMemo(
    () =>
      currentThrough
        ? computeTransactionSummary(transactions, categoryMap, currentThrough)
            .spend
        : monthlySpend,
    [transactions, categoryMap, currentThrough, monthlySpend]
  );
  const previousSpend = useMemo(
    () =>
      previousTransactions
        ? computeTransactionSummary(
            previousTransactions,
            categoryMap,
            previousThrough
          ).spend
        : undefined,
    [previousTransactions, categoryMap, previousThrough]
  );
  if (previousSpend === undefined) return null;

  const difference = currentSpend - previousSpend;
  const equal = Math.abs(difference) < 0.005;
  const Icon = equal ? Minus : difference < 0 ? ArrowDownRight : ArrowUpRight;
  const relativePeriod =
    days === null ? "the previous month" : "this time last month";
  const periodLabel = (year: number, month: number) =>
    days === null
      ? formatMonthKey(monthKeyOf(year, month))
      : `${MONTH_NAMES[month - 1].slice(0, 3)} ${days === 1 ? "1" : `1–${days}`}`;

  return (
    <div className="mt-3 space-y-0.5">
      <p className="flex items-start gap-1.5 text-xs tabular-nums">
        <Icon
          aria-hidden="true"
          className="size-3.5 shrink-0 text-bento-subtle"
        />
        <span>
          {equal ? (
            <>Same spending as {relativePeriod}</>
          ) : (
            <>
              <strong className="font-semibold">
                {formatCurrency(Math.abs(difference), primaryCurrency, true)}{" "}
                {difference < 0 ? "less" : "more"}
              </strong>{" "}
              than {relativePeriod}
            </>
          )}
        </span>
      </p>
      <p className="text-xs text-bento-subtle tabular-nums">
        {periodLabel(year, month)}
        {days !== null &&
          currentSpend !== monthlySpend &&
          ` (${formatCurrency(currentSpend, primaryCurrency, true)})`}{" "}
        vs. {periodLabel(previousYear, previousMonth)} ·{" "}
        {formatCurrency(previousSpend, primaryCurrency, true)} previously
      </p>
    </div>
  );
}
