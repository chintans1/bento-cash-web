"use client";

import { type NormalizedAccount } from "@/lib/account-utils";
import { BUCKETS } from "@/lib/investment-utils";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

export function AllocationBreakdown({
  accounts,
  primaryCurrency,
}: {
  accounts: NormalizedAccount[];
  primaryCurrency: string;
}) {
  const total = accounts.reduce(
    (sum, a) => sum + (a.balanceValid ? a.toBase : 0),
    0
  );

  if (total === 0) return null;

  const bucketRows = BUCKETS.map((bucket) => {
    const bucketAccounts = accounts.filter((a) =>
      bucket.subtypes.has((a.subtype ?? "").toLowerCase())
    );
    const amount = bucketAccounts.reduce(
      (sum, a) => sum + (a.balanceValid ? a.toBase : 0),
      0
    );
    return { bucket, bucketAccounts, amount };
  }).filter((r) => r.amount > 0);

  const matchedIds = new Set(
    bucketRows.flatMap((r) => r.bucketAccounts.map((a) => a.id))
  );
  const otherAccounts = accounts.filter((a) => !matchedIds.has(a.id));
  const otherAmount = otherAccounts.reduce(
    (sum, a) => sum + (a.balanceValid ? a.toBase : 0),
    0
  );

  const rows = [
    ...bucketRows,
    ...(otherAmount > 0.01
      ? [
          {
            bucket: {
              label: "Other",
              color: "bg-gray-400",
              subtypes: new Set<string>(),
            },
            bucketAccounts: otherAccounts,
            amount: otherAmount,
          },
        ]
      : []),
  ];

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Allocation</CardTitle>
        <CardDescription>Hover a row to see accounts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map(({ bucket, bucketAccounts, amount }) => {
          const pct = total > 0 ? (amount / total) * 100 : 0;
          return (
            <HoverCard key={bucket.label}>
              <HoverCardTrigger
                render={<div className="block w-full cursor-default" />}
              >
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-sm text-muted-foreground">
                    {bucket.label}
                  </span>
                  <div className="flex shrink-0 items-baseline gap-2">
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {pct.toFixed(1)}%
                    </span>
                    <span className="font-mono text-sm font-medium tabular-nums">
                      {formatCurrency(amount, primaryCurrency, true)}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", bucket.color)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </HoverCardTrigger>
              <HoverCardContent side="right" align="start" sideOffset={12}>
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {bucket.label}
                </p>
                <ul className="space-y-1.5">
                  {bucketAccounts.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-baseline justify-between gap-4"
                    >
                      <span className="min-w-0 truncate text-sm">{a.name}</span>
                      <span className="shrink-0 font-mono text-sm tabular-nums">
                        {a.balanceValid
                          ? formatCurrency(a.toBase, primaryCurrency, true)
                          : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
                {bucketAccounts.length > 1 && (
                  <div className="mt-2 flex justify-between border-t border-border pt-2">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <span className="font-mono text-xs font-medium tabular-nums">
                      {formatCurrency(amount, primaryCurrency, true)}
                    </span>
                  </div>
                )}
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </CardContent>
    </Card>
  );
}
