"use client";

import {
  type NormalizedAccount,
  formatSubtype,
  formatUpdated,
} from "@/lib/account-utils";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AccountRow({
  account,
  primaryCurrency,
}: {
  account: NormalizedAccount;
  primaryCurrency: string;
}) {
  const showNative =
    account.currency.toLowerCase() !== primaryCurrency.toLowerCase();
  const isInactive = account.status !== "active";

  return (
    <li className="flex items-center gap-3 border-b border-border/50 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              isInactive && "text-muted-foreground"
            )}
          >
            {account.name}
          </span>
          {account.subtype && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {formatSubtype(account.subtype)}
            </span>
          )}
          {isInactive && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {account.status}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        {account.balanceValid ? (
          <>
            <span className="font-mono text-sm font-medium tabular-nums">
              {showNative
                ? formatCurrency(account.balance, account.currency, true)
                : formatCurrency(account.toBase, primaryCurrency, true)}
            </span>
            {showNative && (
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                ≈ {formatCurrency(account.toBase, primaryCurrency, true)}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
        <span className="text-xs text-muted-foreground">
          {formatUpdated(account.lastUpdated)}
        </span>
      </div>
    </li>
  );
}
