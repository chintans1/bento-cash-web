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
}: {
  merchantTotals: MerchantTotal[];
  primaryCurrency: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Top merchants</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-bento-subtle">Loading…</p>
        ) : merchantTotals.length === 0 ? (
          <p className="text-sm text-bento-subtle">No spending data found.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {merchantTotals.map((m) => {
              const maxMerchant = merchantTotals[0].spend;
              return (
                <li key={m.payee} className="flex items-center gap-3">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: `color-mix(in oklab, ${categoryColor(m.payee)} 32%, var(--card))`,
                      color: `color-mix(in oklab, ${categoryColor(m.payee)} 80%, var(--foreground))`,
                    }}
                    aria-hidden="true"
                  >
                    {m.payee.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="truncate text-xs font-medium">
                        {m.payee}
                      </span>
                      <span className="ml-3 shrink-0 font-mono text-xs text-bento-subtle tabular-nums">
                        {formatCurrency(m.spend, primaryCurrency, false)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-bento-muted">
                      <div
                        className="h-full rounded-full bg-bento-brand"
                        style={{
                          width:
                            maxMerchant > 0
                              ? `${(m.spend / maxMerchant) * 100}%`
                              : "0%",
                        }}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-bento-subtle">
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
          href="/transactions"
          className="text-sm text-bento-subtle transition-colors hover:text-bento-default"
        >
          View all transactions →
        </Link>
      </CardFooter>
    </Card>
  );
}
