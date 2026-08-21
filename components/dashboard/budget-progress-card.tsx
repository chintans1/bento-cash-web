import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AlignedSummaryResponse } from "@/lib/lunchmoney/client";
import type { CategoryInfo } from "@/lib/lunchmoney/categories";

/** Ring gauge showing what share of the month's budget has been spent. */
function BudgetGauge({ pct, over }: { pct: number; over: boolean }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(pct, 100) / 100) * circumference;

  return (
    <div className="relative size-16 shrink-0">
      <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="var(--bento-muted)"
          strokeWidth="7"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={over ? "var(--bento-negative)" : "var(--bento-positive)"}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-mono text-xs font-semibold tabular-nums",
          over && "text-bento-negative"
        )}
      >
        {Math.round(pct)}%
      </span>
    </div>
  );
}

/**
 * Budget vs. actual for the month: a headline gauge across all budgeted
 * categories, then per-category progress. Returns null when the user has no
 * budgets configured, so the parent doesn't need to check before rendering.
 */
export function BudgetProgressCard({
  summary,
  categoryMap,
  primaryCurrency,
}: {
  summary: AlignedSummaryResponse;
  categoryMap: Map<number, CategoryInfo>;
  primaryCurrency: string;
}) {
  const budgeted = summary.categories
    .filter((c) => c.totals.budgeted != null && c.totals.budgeted > 0)
    .map((c) => {
      const spent = c.totals.other_activity + c.totals.recurring_activity;
      const budget = c.totals.budgeted!;
      const catInfo = categoryMap.get(c.category_id);
      return {
        id: c.category_id,
        name: catInfo?.name ?? "Unknown",
        spent,
        budget,
      };
    })
    .sort((a, b) => b.spent / b.budget - a.spent / a.budget);

  if (budgeted.length === 0) return null;

  const totalBudget = budgeted.reduce((sum, b) => sum + b.budget, 0);
  const totalSpent = budgeted.reduce((sum, b) => sum + b.spent, 0);
  const remaining = totalBudget - totalSpent;
  const totalPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Budget</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-5 flex items-center gap-4">
          <div className="grid flex-1 grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-bento-subtle">Budget</p>
              <p className="mt-0.5 font-mono text-sm font-medium tabular-nums">
                {formatCurrency(totalBudget, primaryCurrency)}
              </p>
            </div>
            <div>
              <p className="text-bento-subtle">Actual</p>
              <p className="mt-0.5 font-mono text-sm font-medium tabular-nums">
                {formatCurrency(totalSpent, primaryCurrency)}
              </p>
            </div>
            <div>
              <p className="text-bento-subtle">Remaining</p>
              <p
                className={cn(
                  "mt-0.5 font-mono text-sm font-medium tabular-nums",
                  remaining < 0 ? "text-bento-negative" : "text-bento-positive"
                )}
              >
                {formatCurrency(remaining, primaryCurrency)}
              </p>
            </div>
          </div>
          <BudgetGauge pct={totalPct} over={remaining < 0} />
        </div>

        <ul className="flex flex-col gap-3">
          {budgeted.map((item) => {
            const pct = Math.min((item.spent / item.budget) * 100, 100);
            const over = item.spent > item.budget;
            return (
              <li key={item.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{item.name}</span>
                  <span
                    className={cn(
                      "font-mono tabular-nums",
                      over && "text-bento-negative"
                    )}
                  >
                    {formatCurrency(item.spent, primaryCurrency, false)}{" "}
                    <span className="text-bento-subtle">
                      / {formatCurrency(item.budget, primaryCurrency, false)}
                    </span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-bento-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width,background-color]",
                      over ? "bg-bento-negative" : "bg-bento-brand"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
