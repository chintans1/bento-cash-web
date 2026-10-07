import Link from "next/link";
import { Repeat2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { CategoryIcon } from "@/lib/lunchmoney/category-icons";
import { categoryColor } from "@/lib/lunchmoney/category-colors";
import type { RecurringItem, Transaction } from "@/lib/lunchmoney/client";
import { recurringMatch } from "@/lib/lunchmoney/recurring-match";
import type { CategoryInfo } from "@/lib/lunchmoney/categories";

/** The latest activity in the selected month, newest first. */
export function RecentTransactionsCard({
  transactions,
  categoryMap,
  recurringItems,
  primaryCurrency,
  loading,
  transactionsHref,
}: {
  transactions: Transaction[];
  categoryMap: Map<number, CategoryInfo>;
  recurringItems: RecurringItem[];
  primaryCurrency: string;
  loading: boolean;
  transactionsHref: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div role="status" className="flex flex-col gap-2">
            <p className="text-sm text-bento-subtle">Loading transactions…</p>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-xl" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-bento-subtle">No transactions found.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {transactions.map((tx) => {
              const amount = parseFloat(tx.amount);
              const isIncome = amount < 0;
              const category =
                tx.category_id != null
                  ? categoryMap.get(tx.category_id)
                  : undefined;
              const isUncategorized = category == null;
              const categoryName = category?.name ?? "Uncategorized";
              const color = categoryColor(categoryName);

              return (
                <li
                  key={tx.id}
                  className="flex items-center gap-3 rounded-xl px-1 py-1.5"
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-item-tint"
                    style={{ "--item-color": color } as React.CSSProperties}
                  >
                    <CategoryIcon
                      name={categoryName}
                      className="size-4 text-(--item-color)"
                      style={{ "--item-color": color } as React.CSSProperties}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="min-w-0 truncate text-sm font-medium">
                        {tx.payee}
                      </p>
                      {recurringMatch(tx.recurring_id, recurringItems) ===
                        "confirmed" && (
                        <span
                          className="shrink-0"
                          title="Recurring transaction"
                        >
                          <Repeat2
                            aria-hidden="true"
                            className="size-3.5 text-bento-subtle"
                          />
                          <span className="sr-only">Recurring transaction</span>
                        </span>
                      )}
                    </div>
                    <p className="truncate text-(length:--text-caption) text-bento-subtle">
                      {formatShortDate(tx.date)} ·{" "}
                      <span className={cn(isUncategorized && "text-cat-3")}>
                        {categoryName}
                      </span>
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 font-mono text-xs tabular-nums",
                      isIncome && "text-bento-positive"
                    )}
                  >
                    {isIncome ? "+" : "−"}
                    {formatCurrency(Math.abs(amount), primaryCurrency, true)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <CardFooter>
        <Link
          href={transactionsHref}
          className="text-sm text-bento-subtle transition-colors hover:text-bento-default"
        >
          View all transactions →
        </Link>
      </CardFooter>
    </Card>
  );
}
