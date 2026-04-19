import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { FIREMetrics } from "@/lib/lunchmoney/wealth-analytics";

function Metric({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "font-mono text-lg font-semibold tabular-nums",
          highlight && "text-green-600 dark:text-green-400"
        )}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function FIRECard({
  metrics,
  primaryCurrency,
}: {
  metrics: FIREMetrics;
  primaryCurrency: string;
}) {
  const yearsLabel =
    metrics.yearsToFIRE === null
      ? "—"
      : metrics.yearsToFIRE === 0
        ? "Already there"
        : `${metrics.yearsToFIRE.toFixed(1)} yrs`;

  const savingsRateLabel =
    metrics.savingsRate > 0
      ? `${(metrics.savingsRate * 100).toFixed(1)}%`
      : "—";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Financial Health</CardTitle>
        <p className="text-xs text-muted-foreground">
          Based on last 6 months · 4% withdrawal rule · 7% growth
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <Metric
            label="FIRE Number"
            value={formatCurrency(metrics.fireNumber, primaryCurrency, false)}
            sub="25× annual expenses"
          />
          <Metric
            label="Years to FIRE"
            value={yearsLabel}
            sub="at moderate (7%) growth"
            highlight={metrics.yearsToFIRE === 0}
          />
          <Metric
            label="Savings Rate"
            value={savingsRateLabel}
            sub={`${formatCurrency(metrics.monthlySavings, primaryCurrency, false)}/mo`}
            highlight={metrics.savingsRate >= 0.2}
          />
          <Metric
            label="Monthly Surplus"
            value={formatCurrency(
              metrics.monthlySavings,
              primaryCurrency,
              false
            )}
            sub={`Income ${formatCurrency(metrics.monthlyIncome, primaryCurrency, false)} · Spend ${formatCurrency(metrics.monthlyExpenses, primaryCurrency, false)}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
