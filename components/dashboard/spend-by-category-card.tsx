"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryRow, CAT_COLORS } from "./category-row";
import type { CategoryTotal, MoMDelta } from "@/lib/lunchmoney/analytics";
import type { Transaction } from "@/lib/lunchmoney/client";

export function SpendByCategoryCard({
  categoryTotals,
  momDeltas,
  maxCatSpend,
  primaryCurrency,
  transactions,
  loading,
  error,
}: {
  categoryTotals: CategoryTotal[];
  momDeltas: Map<number, MoMDelta>;
  maxCatSpend: number;
  primaryCurrency: string;
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Spend by Category</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-bento-subtle">Loading…</p>
        ) : error ? (
          <p className="text-sm text-bento-danger">{error}</p>
        ) : categoryTotals.length === 0 ? (
          <p className="text-sm text-bento-subtle">No spending data found.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {categoryTotals.map((cat, i) => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                color={CAT_COLORS[i % CAT_COLORS.length]}
                maxSpend={maxCatSpend}
                delta={momDeltas.get(cat.id)}
                primaryCurrency={primaryCurrency}
                transactions={transactions}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
