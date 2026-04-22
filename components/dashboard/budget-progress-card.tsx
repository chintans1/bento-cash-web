import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AlignedSummaryResponse } from "@/lib/lunchmoney/client";
import type { CategoryInfo } from "@/lib/lunchmoney/categories";

/**
 * Shows spend-vs-budget progress bars for each budgeted category.
 * Returns null when the user has no budgets configured, so the parent
 * doesn't need to check before rendering.
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Budget Progress</CardTitle>
      </CardHeader>
      <CardContent>
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
                      over && "text-rose-500"
                    )}
                  >
                    {formatCurrency(item.spent, primaryCurrency, false)}{" "}
                    <span className="text-muted-foreground">
                      / {formatCurrency(item.budget, primaryCurrency, false)}
                    </span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width,background-color]",
                      over ? "bg-rose-500" : "bg-primary"
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
