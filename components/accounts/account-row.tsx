"use client";

import {
  type NormalizedAccount,
  creditUsage,
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
  const usage = isInactive ? null : creditUsage(account);

  return (
    <li className="border-b border-bento-hairline/50 py-3 last:border-0">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              title={account.name}
              className={cn(
                "min-w-0 truncate text-sm font-medium",
                isInactive && "text-bento-subtle"
              )}
            >
              {account.name}
            </span>
            {account.subtype && (
              <Badge variant="secondary">
                {formatSubtype(account.subtype)}
              </Badge>
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
      </div>
      {account.type === "credit" && (
        <div className="mt-2">
          {account.creditLimit === null ? (
            <p className="text-xs text-bento-subtle">
              Credit limit unavailable
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs text-bento-subtle">
                <span>
                  Credit limit{" "}
                  <span className="font-mono tabular-nums">
                    {formatCurrency(account.creditLimit, account.currency)}
                  </span>
                </span>
                {usage && (
                  <span>
                    {Math.round(usage.percentUsed)}% used ·{" "}
                    <span className="font-mono tabular-nums">
                      {formatCurrency(usage.available, account.currency, true)}
                    </span>{" "}
                    available
                  </span>
                )}
              </div>
              {usage && (
                <div
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bento-hairline"
                >
                  <div
                    className={cn(
                      "h-full w-(--progress-width) rounded-full",
                      usage.percentUsed >= 100
                        ? "bg-bento-negative"
                        : "bg-bento-brand"
                    )}
                    style={
                      {
                        "--progress-width": `${Math.min(usage.percentUsed, 100)}%`,
                      } as React.CSSProperties
                    }
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}
