import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CompositionBreakdown } from "@/components/ui/composition-breakdown";
import {
  SummaryAmount,
  SummaryCard,
  SummaryTotals,
} from "@/components/ui/summary-card";
import {
  computeTransactionSummary,
  type CategoryAmount,
} from "@/lib/lunchmoney/analytics";
import { categoryColor } from "@/lib/lunchmoney/category-colors";
import type { CategoryInfo } from "@/lib/lunchmoney/categories";
import type { Transaction } from "@/lib/lunchmoney/client";

const CATEGORY_LIMIT = { Income: 5, Spending: 6 };

function CategoryBreakdown({
  label,
  categories,
  total,
  primaryCurrency,
  selectedCategoryId,
  onCategorySelect,
}: {
  label: "Income" | "Spending";
  categories: CategoryAmount[];
  total: number;
  primaryCurrency: string;
  selectedCategoryId: number | null;
  onCategorySelect: (id: number) => void;
}) {
  const limit = CATEGORY_LIMIT[label];
  const remaining = categories.slice(limit);
  const entries = categories.slice(0, limit).map((category) => ({
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
    <CompositionBreakdown
      title={`${label} by category`}
      separated={label === "Spending"}
      primaryCurrency={primaryCurrency}
      selectedId={selectedCategoryId}
      emptyMessage={
        label === "Income" ? "No income this month." : "No spending this month."
      }
      entries={segments.map(({ id, name, amount, color, txCount }) => ({
        id: id ?? "other",
        label: name,
        percent: (amount / total) * 100,
        amount,
        color,
        detail: `${txCount} ${txCount === 1 ? "transaction" : "transactions"}`,
        onSelect: id === null ? undefined : () => onCategorySelect(id),
      }))}
    />
  );
}

export function MonthSummary({
  transactions,
  categoryMap,
  primaryCurrency,
  loading,
  error,
  selectedCategoryId,
  onCategorySelect,
}: {
  transactions: Transaction[];
  categoryMap: Map<number, CategoryInfo>;
  primaryCurrency: string;
  loading: boolean;
  error: string | null;
  selectedCategoryId: number | null;
  onCategorySelect: (id: number) => void;
}) {
  const { incomeCategories, spendingCategories, income, spend } = useMemo(
    () => computeTransactionSummary(transactions, categoryMap),
    [transactions, categoryMap]
  );
  const net = income - spend;

  const breakdown = (
    <>
      <CategoryBreakdown
        label="Income"
        categories={incomeCategories}
        total={income}
        primaryCurrency={primaryCurrency}
        selectedCategoryId={selectedCategoryId}
        onCategorySelect={onCategorySelect}
      />
      <CategoryBreakdown
        label="Spending"
        categories={spendingCategories}
        total={spend}
        primaryCurrency={primaryCurrency}
        selectedCategoryId={selectedCategoryId}
        onCategorySelect={onCategorySelect}
      />
    </>
  );

  return (
    <SummaryCard className="@page-sidebar/main:max-h-transaction-summary @page-sidebar/main:overflow-y-auto">
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
        <p className="text-sm text-bento-subtle">Month summary unavailable.</p>
      ) : (
        <>
          <SummaryAmount
            label="Net savings"
            amount={net}
            primaryCurrency={primaryCurrency}
            emphasizePositive
          />
          <SummaryTotals
            first={{ label: "Income", amount: income }}
            second={{ label: "Spending", amount: spend }}
            primaryCurrency={primaryCurrency}
          />
          <div className="hidden @page-sidebar/main:block">{breakdown}</div>
          <details className="group/breakdown @page-sidebar/main:hidden">
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
    </SummaryCard>
  );
}
