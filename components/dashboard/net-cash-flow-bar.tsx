import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { MONTH_NAMES, prevMonthOf } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthTotals } from "@/lib/lunchmoney/analytics";

/**
 * Change against the same figure last month. `goodWhenUp` differs by row —
 * more income is good news, more spend isn't — so the color can't be derived
 * from the direction alone.
 */
function Delta({
  current,
  previous,
  goodWhenUp,
}: {
  current: number;
  previous: number;
  goodWhenUp: boolean;
}) {
  if (previous <= 0) return null;

  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 1) return null;

  const up = pct > 0;
  const good = up === goodWhenUp;
  const Arrow = up ? ArrowUp : ArrowDown;

  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-[11px] tabular-nums",
        good ? "text-bento-positive" : "text-bento-negative"
      )}
    >
      <Arrow className="size-3" />
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

/**
 * Income vs. spend for the month: the surplus/deficit headline, each side
 * measured against last month, and a split bar showing their proportion.
 */
export function NetCashFlowBar({
  income,
  spend,
  previous,
  year,
  month,
  primaryCurrency,
}: {
  income: number;
  spend: number;
  previous: MonthTotals;
  year: number;
  month: number;
  primaryCurrency: string;
}) {
  const surplus = income - spend;
  const isPositive = surplus >= 0;
  const total = income + spend;
  const incomeWidth = total > 0 ? (income / total) * 100 : 50;
  const spendWidth = total > 0 ? (spend / total) * 100 : 50;
  const savingsRate = income > 0 ? (surplus / income) * 100 : null;

  const prevSurplus = previous.income - previous.spend;
  const hasPrevious = previous.income > 0 || previous.spend > 0;
  const prevLabel = MONTH_NAMES[prevMonthOf(year, month).month - 1];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Cash flow</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <p
          className={cn(
            "font-heading text-3xl font-semibold tabular-nums",
            isPositive ? "text-bento-positive" : "text-bento-negative"
          )}
        >
          {isPositive ? "+" : "−"}
          {formatCurrency(Math.abs(surplus), primaryCurrency)}
        </p>
        <p className="mt-1 text-xs text-bento-subtle">
          {isPositive ? "left over" : "overspent"}
          {savingsRate !== null &&
            ` · ${savingsRate.toFixed(0)}% of income ${isPositive ? "saved" : "over"}`}
        </p>

        <dl className="mt-6 flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-2 text-bento-subtle">
              <span className="size-2 rounded-full bg-bento-positive" />
              Income
            </dt>
            <dd className="flex items-center gap-2">
              <Delta
                current={income}
                previous={previous.income}
                goodWhenUp={true}
              />
              <span className="font-mono tabular-nums">
                {formatCurrency(income, primaryCurrency)}
              </span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-2 text-bento-subtle">
              <span className="size-2 rounded-full bg-bento-negative" />
              Spend
            </dt>
            <dd className="flex items-center gap-2">
              <Delta
                current={spend}
                previous={previous.spend}
                goodWhenUp={false}
              />
              <span className="font-mono tabular-nums">
                {formatCurrency(spend, primaryCurrency)}
              </span>
            </dd>
          </div>
        </dl>

        <div className="pt-6">
          <div className="flex h-3 overflow-hidden">
            <div
              className="h-full rounded-l-full bg-bento-positive"
              style={{ width: `${incomeWidth}%` }}
            />
            <div
              className="h-full rounded-r-full bg-bento-negative"
              style={{ width: `${spendWidth}%` }}
            />
          </div>
          <div className="mt-1.5 flex text-[11px] text-bento-subtle">
            <span style={{ width: `${incomeWidth}%` }}>in</span>
            <span className="text-right" style={{ width: `${spendWidth}%` }}>
              out
            </span>
          </div>
        </div>

        {hasPrevious && (
          <p className="mt-auto pt-6 text-xs text-bento-subtle">
            {prevLabel} closed at{" "}
            <span
              className={cn(
                "font-medium tabular-nums",
                prevSurplus >= 0 ? "text-bento-positive" : "text-bento-negative"
              )}
            >
              {prevSurplus >= 0 ? "+" : "−"}
              {formatCurrency(Math.abs(prevSurplus), primaryCurrency)}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
