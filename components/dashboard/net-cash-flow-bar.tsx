import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Income vs. spend for the month: the surplus/deficit headline, a breakdown of
 * the two sides, and a split bar showing their proportion.
 *
 * No "use client" needed — this component has no state or event handlers.
 * It receives numbers and renders them. React can render it on the server
 * (or as part of a client tree) without any special treatment.
 */
export function NetCashFlowBar({
  income,
  spend,
  primaryCurrency,
}: {
  income: number;
  spend: number;
  primaryCurrency: string;
}) {
  const surplus = income - spend;
  const isPositive = surplus >= 0;
  const total = income + spend;
  const incomeWidth = total > 0 ? (income / total) * 100 : 50;
  const spendWidth = total > 0 ? (spend / total) * 100 : 50;
  const savingsRate = income > 0 ? (surplus / income) * 100 : null;

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
            <dd className="font-mono tabular-nums">
              {formatCurrency(income, primaryCurrency)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-2 text-bento-subtle">
              <span className="size-2 rounded-full bg-bento-negative" />
              Spend
            </dt>
            <dd className="font-mono tabular-nums">
              {formatCurrency(spend, primaryCurrency)}
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
      </CardContent>
    </Card>
  );
}
