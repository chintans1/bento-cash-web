import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CategoryTotal, MoMDelta } from "@/lib/lunchmoney/analytics";

function TrendRow({
  name,
  spend,
  pct,
  currency,
  direction,
}: {
  name: string;
  spend: number;
  pct: number;
  currency: string;
  direction: "up" | "down";
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span
        className={cn(
          "text-xs font-semibold tabular-nums",
          direction === "up"
            ? "text-red-500 dark:text-red-400"
            : "text-green-600 dark:text-green-400"
        )}
      >
        {direction === "up" ? "+" : ""}
        {pct.toFixed(0)}%
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
      <span className="font-mono text-xs text-muted-foreground tabular-nums">
        {formatCurrency(spend, currency, false)}
      </span>
    </div>
  );
}

export function SpendingTrends({
  categoryTotals,
  momDeltas,
  primaryCurrency,
}: {
  categoryTotals: CategoryTotal[];
  momDeltas: Map<number, MoMDelta>;
  primaryCurrency: string;
}) {
  // Attach delta to each category and filter to those with a real % change
  const withDelta = categoryTotals
    .map((cat) => ({ ...cat, delta: momDeltas.get(cat.id) }))
    .filter((c) => c.delta?.pct != null) as Array<
    CategoryTotal & { delta: MoMDelta & { pct: number } }
  >;

  const growing = [...withDelta]
    .filter((c) => c.delta.pct > 0)
    .sort((a, b) => b.delta.pct - a.delta.pct)
    .slice(0, 4);

  const shrinking = [...withDelta]
    .filter((c) => c.delta.pct < 0)
    .sort((a, b) => a.delta.pct - b.delta.pct)
    .slice(0, 4);

  if (growing.length === 0 && shrinking.length === 0) return null;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Spending Trends</CardTitle>
        <p className="text-xs text-muted-foreground">
          Month-over-month category changes
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* Growing */}
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-red-500" />
              <span className="text-xs font-semibold text-red-500 dark:text-red-400">
                Increasing
              </span>
            </div>
            {growing.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No categories increased
              </p>
            ) : (
              <div className="divide-y divide-border/50">
                {growing.map((c) => (
                  <TrendRow
                    key={c.id}
                    name={c.name}
                    spend={c.spend}
                    pct={c.delta.pct}
                    currency={primaryCurrency}
                    direction="up"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Shrinking */}
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <TrendingDown className="size-3.5 text-green-600 dark:text-green-400" />
              <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                Decreasing
              </span>
            </div>
            {shrinking.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No categories decreased
              </p>
            ) : (
              <div className="divide-y divide-border/50">
                {shrinking.map((c) => (
                  <TrendRow
                    key={c.id}
                    name={c.name}
                    spend={c.spend}
                    pct={c.delta.pct}
                    currency={primaryCurrency}
                    direction="down"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
