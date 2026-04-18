import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecurringItem } from "@/lib/lunchmoney/client";

/**
 * Normalizes LM's recurring items to a monthly equivalent amount and renders
 * them as a ranked list with a total in the header.
 *
 * Only "reviewed" items are shown — unreviewed recurring items are LM's way
 * of saying "we detected this but you haven't confirmed it yet."
 */
export function SubscriptionsCard({
  items,
  primaryCurrency,
}: {
  items: RecurringItem[];
  primaryCurrency: string;
}) {
  const monthly = items
    .filter((item) => item.status === "reviewed")
    .map((item) => {
      const c = item.transaction_criteria;
      let monthlyAmount = Math.abs(parseFloat(c.amount));
      if (c.granularity === "week") monthlyAmount = (monthlyAmount * 52) / 12;
      else if (c.granularity === "year") monthlyAmount = monthlyAmount / 12;
      else if (c.granularity === "day") monthlyAmount = monthlyAmount * 30;
      monthlyAmount = monthlyAmount / (c.quantity ?? 1);
      const name = item.overrides?.payee ?? c.payee ?? "Unknown";
      return { id: item.id, name, monthlyAmount, currency: c.currency };
    })
    .filter((i) => i.monthlyAmount > 0)
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  if (monthly.length === 0) return null;

  const total = monthly.reduce((s, i) => s + i.monthlyAmount, 0);

  return (
    <Card className="-mt-7">
      <CardHeader>
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-lg">Subscriptions & Recurring</CardTitle>
          <span className="font-mono text-sm text-muted-foreground tabular-nums">
            {formatCurrency(total, primaryCurrency, false)}/mo
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col">
          {monthly.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between border-b border-border/50 py-2.5 first:pt-0 last:border-0 last:pb-0"
            >
              <span className="text-sm">{item.name}</span>
              <span className="font-mono text-sm text-muted-foreground tabular-nums">
                {formatCurrency(item.monthlyAmount, primaryCurrency, false)}/mo
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
