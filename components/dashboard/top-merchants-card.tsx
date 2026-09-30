import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { categoryColor } from "@/lib/lunchmoney/category-colors";
import type { MerchantTotal } from "@/lib/lunchmoney/analytics";

export function TopMerchantsCard({
  merchantTotals,
  primaryCurrency,
  loading,
  transactionsHref,
}: {
  merchantTotals: MerchantTotal[];
  primaryCurrency: string;
  loading: boolean;
  transactionsHref: string;
}) {
  // Sorted desc by spend, so the first row is the bar's full width.
  const maxSpend = merchantTotals[0]?.spend ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Top merchants</CardTitle>
        <p className="mt-1 text-xs text-bento-subtle">
          Excludes recurring payments
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-bento-subtle">Loading…</p>
        ) : merchantTotals.length === 0 ? (
          <p className="text-sm text-bento-subtle">
            No flexible spending found.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {merchantTotals.map((m) => {
              const color = categoryColor(m.payee);
              return (
                <li key={m.payee} className="flex items-center gap-3">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-item-tint text-xs font-semibold text-item-ink"
                    style={{ "--item-color": color } as React.CSSProperties}
                    aria-hidden="true"
                  >
                    {m.payee.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className="min-w-0 truncate text-xs font-medium"
                        title={m.payee}
                      >
                        {m.payee}
                      </span>
                      <span className="ml-3 shrink-0 font-mono text-xs text-bento-subtle tabular-nums">
                        {formatCurrency(m.spend, primaryCurrency, false)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-bento-hairline">
                      <div
                        className="h-full w-(--progress-width) rounded-full bg-series-1"
                        style={
                          {
                            "--progress-width": `${(m.spend / maxSpend) * 100}%`,
                          } as React.CSSProperties
                        }
                      />
                    </div>
                    <p className="mt-0.5 text-(length:--text-micro) text-bento-subtle">
                      {m.txCount} transaction{m.txCount !== 1 ? "s" : ""}
                    </p>
                  </div>
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
