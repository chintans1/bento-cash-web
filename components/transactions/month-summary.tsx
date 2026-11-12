import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CompositionBar,
  useCompositionHighlight,
} from "@/components/ui/composition-bar";
import { formatCurrency } from "@/lib/format";
import {
  computeCategoryTotals,
  computeIncomeCategoryTotals,
} from "@/lib/lunchmoney/analytics";
import { categoryColor } from "@/lib/lunchmoney/category-colors";
import type { CategoryInfo } from "@/lib/lunchmoney/categories";
import type { Transaction } from "@/lib/lunchmoney/client";
import { cn } from "@/lib/utils";

type CategoryAmount = ReturnType<typeof computeIncomeCategoryTotals>[number];

const CATEGORY_LIMIT = 4;
const CATEGORY_ROW =
  "grid min-h-8 w-full grid-cols-summary-category items-center gap-2 rounded-lg px-1 py-1.5 text-left text-xs";

function CategoryBreakdown({
  label,
  categories,
  total,
  primaryCurrency,
  onCategorySelect,
}: {
  label: "Income" | "Spending";
  categories: CategoryAmount[];
  total: number;
  primaryCurrency: string;
  onCategorySelect: (id: number) => void;
}) {
  const { activeId, onHover, rowHandlers } = useCompositionHighlight<
    number | "other"
  >();
  const remaining = categories.slice(CATEGORY_LIMIT);
  const entries = categories.slice(0, CATEGORY_LIMIT).map((category) => ({
    ...category,
    color: categoryColor(category.name),
  }));
  const other =
    remaining.length > 0
      ? {
          id: null,
          name: `${remaining.length} more`,
          amount: remaining.reduce((sum, category) => sum + category.amount, 0),
          txCount: remaining.reduce(
            (sum, category) => sum + category.txCount,
            0
          ),
          color: "var(--bento-subtle)",
        }
      : null;
  const segments = other ? [...entries, other] : entries;

  return (
    <section className="border-t border-bento-hairline pt-panel-gap">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-medium text-bento-subtle">{label}</h3>
        <p
          className={cn(
            "font-heading text-xl font-semibold tabular-nums",
            label === "Income" && "text-bento-positive"
          )}
        >
          {formatCurrency(total, primaryCurrency, true)}
        </p>
      </div>
      {total > 0 && (
        <>
          <CompositionBar<number | "other">
            className="mt-3 mb-2"
            activeId={activeId}
            onHover={onHover}
            segments={segments.map(({ id, amount, color }) => ({
              id: id ?? "other",
              percent: (amount / total) * 100,
              color,
            }))}
          />
          <ul className="mt-1 divide-y divide-bento-hairline/50">
            {segments.map(({ id, name, amount, txCount, color }) => {
              const segmentId = id ?? "other";
              const share = (amount / total) * 100;
              const rowClassName = cn(
                CATEGORY_ROW,
                "transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none motion-reduce:transition-none",
                activeId === segmentId && "bg-bento-raised"
              );
              const content = (
                <>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="size-1.5 shrink-0 rounded-full bg-(--item-color)"
                      style={{ "--item-color": color } as React.CSSProperties}
                    />
                    <span className="min-w-0 wrap-anywhere">
                      {name}
                      <span className="block text-bento-subtle tabular-nums">
                        {txCount}{" "}
                        {txCount === 1 ? "transaction" : "transactions"}
                      </span>
                    </span>
                  </span>
                  <span className="font-mono font-medium tabular-nums">
                    {formatCurrency(amount, primaryCurrency, true)}
                  </span>
                  <span className="text-right text-bento-subtle tabular-nums">
                    {share < 1 ? "<1%" : `${Math.round(share)}%`}
                  </span>
                </>
              );
              return (
                <li key={segmentId}>
                  {id === null ? (
                    <div
                      tabIndex={0}
                      {...rowHandlers(segmentId)}
                      className={rowClassName}
                    >
                      {content}
                    </div>
                  ) : (
                    <button
                      type="button"
                      title={name}
                      onClick={() => onCategorySelect(id)}
                      {...rowHandlers(segmentId)}
                      className={rowClassName}
                    >
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

export function MonthSummary({
  transactions,
  categoryMap,
  primaryCurrency,
  loading,
  error,
  onCategorySelect,
}: {
  transactions: Transaction[];
  categoryMap: Map<number, CategoryInfo>;
  primaryCurrency: string;
  loading: boolean;
  error: string | null;
  onCategorySelect: (id: number) => void;
}) {
  const { incomeCategories, spendingCategories, income, spend } =
    useMemo(() => {
      const incomeCategories = computeIncomeCategoryTotals(
        transactions,
        categoryMap,
        Infinity
      );
      const spendingCategories = computeCategoryTotals(
        transactions,
        categoryMap,
        Infinity
      ).map(({ spend, ...category }) => ({ ...category, amount: spend }));
      const income = incomeCategories.reduce(
        (sum, category) => sum + category.amount,
        0
      );
      const spend = spendingCategories.reduce(
        (sum, category) => sum + category.amount,
        0
      );
      return {
        incomeCategories,
        spendingCategories,
        income,
        spend,
      };
    }, [transactions, categoryMap]);
  const net = income - spend;

  const breakdown = (
    <div className="space-y-panel-gap">
      <CategoryBreakdown
        label="Income"
        categories={incomeCategories}
        total={income}
        primaryCurrency={primaryCurrency}
        onCategorySelect={onCategorySelect}
      />
      <CategoryBreakdown
        label="Spending"
        categories={spendingCategories}
        total={spend}
        primaryCurrency={primaryCurrency}
        onCategorySelect={onCategorySelect}
      />
    </div>
  );

  return (
    <Card className="@page-sidebar/main:max-h-transaction-summary @page-sidebar/main:overflow-y-auto">
      <CardHeader>
        <CardTitle>
          <h2 id="transactions-month-summary">Month summary</h2>
        </CardTitle>
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
              <div className="min-w-0">
                <dt className="text-xs text-bento-subtle">Net savings</dt>
                <dd
                  className={cn(
                    "mt-1 font-heading text-2xl leading-tight font-semibold wrap-anywhere tabular-nums",
                    net > 0 && "text-bento-positive",
                    net < 0 && "text-bento-negative"
                  )}
                >
                  {formatCurrency(net, primaryCurrency, true)}
                </dd>
              </div>
            </dl>
            <dl className="mt-panel-gap flex flex-wrap justify-between gap-2 border-t border-bento-hairline pt-panel-gap @page-sidebar/main:hidden">
              <div>
                <dt className="text-xs text-bento-subtle">Income</dt>
                <dd className="font-mono text-sm text-bento-positive tabular-nums">
                  {formatCurrency(income, primaryCurrency, true)}
                </dd>
              </div>
              <div className="text-right">
                <dt className="text-xs text-bento-subtle">Spending</dt>
                <dd className="font-mono text-sm tabular-nums">
                  {formatCurrency(spend, primaryCurrency, true)}
                </dd>
              </div>
            </dl>
            <div className="mt-panel-gap hidden @page-sidebar/main:block">
              {breakdown}
            </div>
            <details className="group/breakdown mt-panel-gap border-t border-bento-hairline @page-sidebar/main:hidden">
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-lg text-xs font-medium text-bento-subtle focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                Income and spending breakdown
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 transition-transform group-open/breakdown:rotate-180"
                />
              </summary>
              {breakdown}
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}
