import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MONTH_NAMES } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/format";
import {
  computeCategoryTotals,
  computeIncomeCategoryTotals,
  computeMerchantTotals,
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
          <div
            aria-hidden="true"
            className="mt-2 flex h-2 overflow-hidden rounded-full bg-bento-muted"
          >
            {segments.map(({ id, amount, color }) => (
              <span
                key={id ?? "other"}
                className="w-(--progress-width) shrink-0 bg-(--item-color) ring-1 ring-card ring-inset"
                style={
                  {
                    "--item-color": color,
                    "--progress-width": `${(amount / total) * 100}%`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
          <ul className="mt-1 divide-y divide-bento-hairline/50">
            {segments.map(({ id, name, amount, txCount, color }) => {
              const share = (amount / total) * 100;
              const content = (
                <>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="size-1.5 shrink-0 rounded-full bg-(--item-color)"
                      style={{ "--item-color": color } as React.CSSProperties}
                    />
                    <span className="min-w-0 wrap-anywhere">
                      {name}{" "}
                      <span
                        className="inline-block text-bento-subtle tabular-nums"
                        aria-label={`${txCount} ${txCount === 1 ? "transaction" : "transactions"}`}
                      >
                        ×{txCount}
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
                <li key={id ?? "other"}>
                  {id === null ? (
                    <div className={CATEGORY_ROW}>{content}</div>
                  ) : (
                    <button
                      type="button"
                      title={name}
                      onClick={() => onCategorySelect(id)}
                      className={cn(
                        CATEGORY_ROW,
                        "transition-colors hover:bg-bento-raised focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
                      )}
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
  const { incomeCategories, spendingCategories, topMerchants, income, spend } =
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
        topMerchants: computeMerchantTotals(transactions, categoryMap, 5),
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
      {topMerchants.length > 0 && (
        <section className="border-t border-bento-hairline pt-panel-gap">
          <h3 className="text-xs font-medium">Top merchants</h3>
          <p className="mt-0.5 text-xs text-bento-subtle">
            Excludes recurring payments
          </p>
          <ul className="mt-2 divide-y divide-bento-hairline/50">
            {topMerchants.map(({ payee, spend }) => (
              <li
                key={payee}
                className="relative isolate flex min-h-8 items-center justify-between gap-2 overflow-hidden px-1.5 text-xs"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 right-0 -z-10 w-(--progress-width) rounded-l-sm bg-bento-brand/15"
                  style={
                    {
                      "--progress-width": `${(spend / topMerchants[0].spend) * 100}%`,
                    } as React.CSSProperties
                  }
                />
                <span title={payee} className="min-w-0 truncate">
                  {payee}
                </span>
                <span className="shrink-0 font-mono font-medium tabular-nums">
                  {formatCurrency(spend, primaryCurrency, true)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
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
            <dl className="flex flex-wrap justify-between gap-2">
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
              <div className="text-right">
                <dt className="text-xs text-bento-subtle">Transactions</dt>
                <dd className="mt-1 font-heading text-2xl leading-tight font-semibold tabular-nums">
                  {transactions.length}
                </dd>
              </div>
            </dl>
            <dl className="mt-panel-gap flex flex-wrap justify-between gap-2 border-t border-bento-hairline pt-panel-gap @transactions-rail/main:hidden">
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
            <div className="mt-panel-gap hidden @transactions-rail/main:block">
              {breakdown}
            </div>
            <details className="group/breakdown mt-panel-gap border-t border-bento-hairline @transactions-rail/main:hidden">
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
