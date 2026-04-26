"use client";

import {
  type NormalizedAccount,
  formatSubtype,
  formatUpdated,
} from "@/lib/account-utils";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
    <li className="flex items-center gap-3 border-b border-bento-hairline/50 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              isInactive && "text-bento-subtle"
            )}
          >
            {account.name}
          </span>
          {account.subtype && (
            <Badge variant="secondary">{formatSubtype(account.subtype)}</Badge>
          )}
          {isInactive && <Badge variant="secondary">{account.status}</Badge>}
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
              <span className="font-mono text-xs text-bento-subtle tabular-nums">
                ≈ {formatCurrency(account.toBase, primaryCurrency, true)}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-bento-subtle">—</span>
        )}
        <span className="text-xs text-bento-subtle">
          {formatUpdated(account.lastUpdated)}
        </span>
      </div>
    </li>
  );
}
