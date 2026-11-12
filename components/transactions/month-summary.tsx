import { useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MONTH_NAMES } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/format";
import {
  computeCategoryTotals,
  filterIncomeTxs,
} from "@/lib/lunchmoney/analytics";
import { categoryColor } from "@/lib/lunchmoney/category-colors";
import type { CategoryInfo } from "@/lib/lunchmoney/categories";
import type { Transaction } from "@/lib/lunchmoney/client";
import { cn } from "@/lib/utils";

export function MonthSummary({
  year,
  month,
  transactions,
  categoryMap,
  primaryCurrency,
  loading,
  error,
  onCategorySelect,
}: {
  year: number;
  month: number;
  transactions: Transaction[];
  categoryMap: Map<number, CategoryInfo>;
  primaryCurrency: string;
  loading: boolean;
  error: string | null;
  onCategorySelect: (id: number) => void;
}) {
  const { income, spend, topCategories } = useMemo(() => {
    const categories = computeCategoryTotals(
      transactions,
      categoryMap,
      Infinity
    );
    return {
      income: filterIncomeTxs(transactions, categoryMap).reduce(
        (sum, transaction) => sum - transaction.to_base,
        0
      ),
      spend: categories.reduce((sum, category) => sum + category.spend, 0),
      topCategories: categories.slice(0, 3),
    };
  }, [transactions, categoryMap]);
  const net = income - spend;
  const currency = (amount: number) =>
    formatCurrency(amount, primaryCurrency, true);

  const categoryList = (
    <ul className="mt-1">
      {topCategories.map((category) => (
        <li key={category.id}>
          <button
            type="button"
            onClick={() => onCategorySelect(category.id)}
            title={category.name}
            className="flex min-h-10 w-full items-center gap-2 rounded-lg text-left text-xs transition-colors hover:bg-bento-raised focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full bg-(--item-color)"
              style={
                {
                  "--item-color": categoryColor(category.name),
                } as React.CSSProperties
              }
            />
            <span className="min-w-0 flex-1 truncate">{category.name}</span>
            <span className="shrink-0 font-mono tabular-nums">
              {currency(category.spend)}
            </span>
            <ChevronRight
              aria-hidden="true"
              className="size-3.5 shrink-0 text-bento-subtle"
            />
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-baseline justify-between">
        <CardTitle>
          <h2 id="transactions-month-summary">Month summary</h2>
        </CardTitle>
        <p className="text-xs text-bento-subtle">
          {MONTH_NAMES[month - 1]} {year}
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div
            role="status"
            aria-label="Loading month summary"
            className="space-y-panel-gap"
          >
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-bento-subtle">
            Month summary unavailable.
          </p>
        ) : (
          <>
            <dl>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 @transactions-rail/main:block">
                <dt className="text-xs text-bento-subtle">Net cash flow</dt>
                <dd
                  className={cn(
                    "font-heading text-2xl leading-tight font-semibold break-words tabular-nums @transactions-rail/main:mt-1 @transactions-rail/main:text-3xl",
                    net > 0 && "text-bento-positive",
                    net < 0 && "text-bento-negative"
                  )}
                >
                  {net > 0 && "+"}
                  {currency(net)}
                </dd>
              </div>
              <div className="mt-panel-gap grid grid-cols-2 gap-3 border-t border-bento-hairline pt-panel-gap">
                <div className="min-w-0">
                  <dt className="text-xs text-bento-subtle">Money in</dt>
                  <dd className="mt-1 font-mono text-sm font-medium break-words tabular-nums">
                    {currency(income)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-bento-subtle">Money out</dt>
                  <dd className="mt-1 font-mono text-sm font-medium break-words tabular-nums">
                    {currency(spend)}
                  </dd>
                </div>
              </div>
            </dl>
            {topCategories.length > 0 && (
              <>
                <div className="mt-panel-gap hidden border-t border-bento-hairline pt-panel-gap @transactions-rail/main:block">
                  <h3 className="text-xs font-medium text-bento-subtle">
                    Top spending categories
                  </h3>
                  {categoryList}
                </div>
                <details className="group/categories mt-panel-gap border-t border-bento-hairline @transactions-rail/main:hidden">
                  <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-lg text-xs font-medium text-bento-subtle focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                    Top spending categories
                    <ChevronDown
                      aria-hidden="true"
                      className="size-4 transition-transform group-open/categories:rotate-180"
                    />
                  </summary>
                  {categoryList}
                </details>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
