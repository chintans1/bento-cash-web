import { formatCurrency, formatShortDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { categoryColor } from "@/lib/lunchmoney/category-colors";
import type { RecurringItem } from "@/lib/lunchmoney/client";

type Bill = {
  id: number;
  name: string;
  monthlyAmount: number;
  cadence: string;
  nextDate: string | null;
};

const CADENCE_LABELS: Record<string, string> = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
  year: "Annually",
};

function cadenceLabel(granularity: string, quantity: number): string {
  if (quantity > 1) return `Every ${quantity} ${granularity}s`;
  return CADENCE_LABELS[granularity] ?? granularity;
}

/** Earliest expected occurrence that hasn't happened yet, when LM provides one. */
function nextOccurrence(item: RecurringItem, today: string): string | null {
  const dates = item.matches?.expected_occurrence_dates ?? [];
  return dates.filter((d) => d >= today).sort()[0] ?? null;
}

/**
 * Recurring items from Lunch Money, shown as a bills list with each item's
 * cadence and — when LM knows it — the next expected date. Amounts are
 * normalized to a monthly equivalent so the header total is comparable.
 *
 * Only "reviewed" items are shown; "suggested" ones are LM's guesses that the
 * user hasn't confirmed.
 */
export function UpcomingBillsCard({
  items,
  primaryCurrency,
}: {
  items: RecurringItem[];
  primaryCurrency: string;
}) {
  const today = new Date().toISOString().slice(0, 10);

  const bills: Bill[] = items
    .filter((item) => item.status === "reviewed")
    .map((item) => {
      const c = item.transaction_criteria;
      const quantity = c.quantity ?? 1;
      let monthlyAmount = Math.abs(parseFloat(c.amount));
      if (c.granularity === "week") monthlyAmount = (monthlyAmount * 52) / 12;
      else if (c.granularity === "year") monthlyAmount = monthlyAmount / 12;
      else if (c.granularity === "day") monthlyAmount = monthlyAmount * 30;
      monthlyAmount = monthlyAmount / quantity;

      return {
        id: item.id,
        name: item.overrides?.payee ?? c.payee ?? "Unknown",
        monthlyAmount,
        cadence: cadenceLabel(c.granularity, quantity),
        nextDate: nextOccurrence(item, today),
      };
    })
    .filter((b) => b.monthlyAmount > 0)
    .sort((a, b) => {
      if (a.nextDate && b.nextDate) return a.nextDate.localeCompare(b.nextDate);
      if (a.nextDate) return -1;
      if (b.nextDate) return 1;
      return b.monthlyAmount - a.monthlyAmount;
    });

  if (bills.length === 0) return null;

  const total = bills.reduce((sum, b) => sum + b.monthlyAmount, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle className="text-lg">Upcoming bills</CardTitle>
          <span className="font-mono text-xs text-bento-subtle tabular-nums">
            {formatCurrency(total, primaryCurrency)}/mo
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-1">
          {bills.map((bill) => {
            const color = categoryColor(bill.name);
            return (
              <li
                key={bill.id}
                className="flex items-center gap-3 rounded-xl px-1 py-1.5 transition-colors hover:bg-bento-raised"
              >
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: `color-mix(in oklab, ${color} var(--chip-tint), transparent)`,
                    color: `color-mix(in oklab, ${color} 80%, var(--foreground))`,
                  }}
                  aria-hidden="true"
                >
                  {bill.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{bill.name}</p>
                  <p className="text-[11px] text-bento-subtle">
                    {bill.nextDate
                      ? `${bill.cadence} · next ${formatShortDate(bill.nextDate)}`
                      : bill.cadence}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs tabular-nums">
                  {formatCurrency(bill.monthlyAmount, primaryCurrency)}
                  <span className="text-bento-subtle">/mo</span>
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
