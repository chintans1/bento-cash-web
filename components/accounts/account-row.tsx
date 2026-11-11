"use client";

import {
  type NormalizedAccount,
  creditUsage,
  formatSubtype,
  formatUpdated,
} from "@/lib/account-utils";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AccountRow({
  account,
  primaryCurrency,
  byInstitution = false,
}: {
  account: NormalizedAccount;
  primaryCurrency: string;
  byInstitution?: boolean;
}) {
  const showNative =
    account.currency.toLowerCase() !== primaryCurrency.toLowerCase();
  const isInactive = account.status !== "active";
  const usage = isInactive ? null : creditUsage(account);
  const detail = [
    !byInstitution && (account.institution || "Other"),
    account.subtype
      ? formatSubtype(account.subtype)
      : formatSubtype(account.type),
    account.source === "manual" && "Manual",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="border-b border-bento-hairline/60 py-panel-row last:border-0">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p
            title={account.name}
            className={cn(
              "text-sm font-medium wrap-break-word",
              isInactive && "text-bento-subtle"
            )}
          >
            {account.name}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-bento-subtle">
            {detail}
          </p>
          {isInactive && (
            <span
              className={cn(
                "mt-1 inline-block rounded-md px-1.5 py-0.5 text-xs",
                account.status === "revoked"
                  ? "bg-warning/10 text-warning-foreground"
                  : "bg-bento-raised text-bento-subtle"
              )}
            >
              {formatSubtype(account.status)}
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {account.balanceValid ? (
            <>
              <span className="text-sm font-medium tabular-nums">
                {formatCurrency(account.toBase, primaryCurrency, true)}
              </span>
              {showNative && (
                <span className="text-xs text-bento-subtle tabular-nums">
                  {formatCurrency(account.balance, account.currency, true)}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-bento-subtle">
              Balance unavailable
            </span>
          )}
          <span className="text-xs text-bento-subtle">
            {account.lastUpdated
              ? `Updated ${formatUpdated(account.lastUpdated)}`
              : "Update unavailable"}
          </span>
        </div>
      </div>
      {account.type === "credit" && usage && (
        <div className="mt-3 flex items-center gap-3">
          <div
            role="meter"
            aria-label={`${account.name} credit used`}
            aria-valuetext={`${Math.round(usage.percentUsed)}% of ${formatCurrency(account.creditLimit!, account.currency, true)} credit limit used`}
            aria-valuenow={Math.round(usage.percentUsed)}
            aria-valuemin={0}
            aria-valuemax={Math.max(100, Math.round(usage.percentUsed))}
            className="h-1 max-w-24 min-w-12 flex-1 overflow-hidden rounded-full bg-bento-raised"
          >
            <div
              className={cn(
                "h-full w-(--progress-width) rounded-full",
                usage.percentUsed >= 100
                  ? "bg-bento-negative"
                  : "bg-bento-subtle/60"
              )}
              style={
                {
                  "--progress-width": `${Math.min(usage.percentUsed, 100)}%`,
                } as React.CSSProperties
              }
            />
          </div>
          <span className="text-xs text-bento-subtle tabular-nums">
            {Math.round(usage.percentUsed)}% used ·{" "}
            {formatCurrency(usage.available, account.currency, true)} available
          </span>
        </div>
      )}
    </li>
  );
}
