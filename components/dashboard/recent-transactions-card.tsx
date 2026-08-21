import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { CategoryIcon } from "@/lib/lunchmoney/category-icons";
import { categoryColor } from "@/lib/lunchmoney/category-colors";
import type { Transaction } from "@/lib/lunchmoney/client";
import type { CategoryInfo } from "@/lib/lunchmoney/categories";

/** The latest activity in the selected month, newest first. */
export function RecentTransactionsCard({
  transactions,
  categoryMap,
  primaryCurrency,
  loading,
}: {
  transactions: Transaction[];
  categoryMap: Map<number, CategoryInfo>;
  primaryCurrency: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-xl bg-bento-raised"
              />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-bento-subtle">No transactions found.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {transactions.map((tx) => {
              const amount = parseFloat(tx.amount);
              const isIncome = amount < 0;
              const categoryName =
                tx.category_id != null
                  ? (categoryMap.get(tx.category_id)?.name ?? "Uncategorized")
                  : "Uncategorized";
              const color = categoryColor(categoryName);

              return (
                <li
                  key={tx.id}
                  className="flex items-center gap-3 rounded-xl px-1 py-1.5 transition-colors hover:bg-bento-raised"
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: `color-mix(in oklab, ${color} var(--chip-tint), transparent)`,
                    }}
                  >
                    <CategoryIcon
                      name={categoryName}
                      className="size-4"
                      style={{ color }}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{tx.payee}</p>
                    <p className="truncate text-[11px] text-bento-subtle">
                      {formatShortDate(tx.date)} · {categoryName}
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
          href="/transactions"
          className="text-sm text-bento-subtle transition-colors hover:text-bento-default"
        >
          View all transactions →
        </Link>
      </CardFooter>
    </Card>
  );
}
