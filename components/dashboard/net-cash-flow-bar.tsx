import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Green/red split bar showing income vs. spend for the month, with a
 * surplus/deficit figure in the header.
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

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-lg">Net Cash Flow</CardTitle>
          <span
            className={cn(
              "font-mono text-lg font-bold tabular-nums",
              isPositive
                ? "text-green-600 dark:text-green-400"
                : "text-rose-500"
            )}
          >
            {isPositive ? "+" : "−"}
            {formatCurrency(Math.abs(surplus), primaryCurrency, false)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center">
        <div className="flex h-3 overflow-hidden">
          <div
            className="h-full rounded-l-full bg-green-500"
            style={{ width: `${incomeWidth}%` }}
          />
          <div
            className="h-full rounded-r-full bg-rose-500"
            style={{ width: `${spendWidth}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-2 text-sm">
          <span className="font-medium text-green-600 dark:text-green-400">
            {formatCurrency(income, primaryCurrency, false)}{" "}
            <span className="text-xs font-normal text-bento-subtle">in</span>
          </span>
          <span className="font-medium text-rose-500">
            {formatCurrency(spend, primaryCurrency, false)}{" "}
            <span className="text-xs font-normal text-bento-subtle">out</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
