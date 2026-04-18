import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
        <CardTitle className="text-lg">Top Merchants</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : merchantTotals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No spending data found.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {merchantTotals.map((m, i) => {
              const maxMerchant = merchantTotals[0].spend;
              return (
                <li key={m.payee} className="flex items-center gap-3">
                  <span className="w-4 shrink-0 text-right font-mono text-xs text-muted-foreground/60 tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="truncate text-xs font-medium">
                        {m.payee}
                      </span>
                      <span className="ml-3 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                        {formatCurrency(m.spend, primaryCurrency, false)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width:
                            maxMerchant > 0
                              ? `${(m.spend / maxMerchant) * 100}%`
                              : "0%",
                        }}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
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
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          View all transactions →
        </Link>
      </CardFooter>
    </Card>
  );
}
