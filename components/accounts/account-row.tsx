"use client";

import { ChevronRight } from "lucide-react";
import {
  type NormalizedAccount,
  creditUsage,
  formatSubtype,
  formatUpdated,
} from "@/lib/account-utils";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getAccountStatus } from "@/lib/account-status";
import { AccountStatusBadge } from "./account-status-badge";

export function AccountRow({
  account,
  primaryCurrency,
  byInstitution = false,
  onSelect,
}: {
  account: NormalizedAccount;
  primaryCurrency: string;
  byInstitution?: boolean;
  onSelect: (account: NormalizedAccount, trigger: HTMLButtonElement) => void;
}) {
  const showNative =
    account.currency.toLowerCase() !== primaryCurrency.toLowerCase();
  const isInactive = account.status !== "active";
  const status = getAccountStatus(account.status);
  const usage = isInactive ? null : creditUsage(account);
  const updated = account.lastUpdated
    ? `Updated ${formatUpdated(account.lastUpdated)}`
    : "Update unavailable";
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
    <li className="group/account relative cursor-pointer px-(--card-spacing) py-panel-row before:pointer-events-none before:absolute before:inset-x-(--card-spacing) before:bottom-0 before:h-px before:bg-bento-hairline/60 last:before:hidden hover:bg-bento-raised/40">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1 space-y-0.5">
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={(event) => onSelect(account, event.currentTarget)}
            className={cn(
              "block max-w-full text-left text-sm leading-5 font-medium outline-none after:absolute after:inset-0 focus-visible:after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset",
              isInactive && !status.tone && "text-bento-subtle"
            )}
          >
            <span className="block truncate">{account.name}</span>
          </button>
          <div className="flex h-5 items-center gap-1.5">
            {isInactive && (
              <AccountStatusBadge
                status={account.status}
                className="max-w-full shrink-0 whitespace-nowrap"
              />
            )}
            <p className="truncate text-xs text-bento-subtle">{detail}</p>
          </div>
        </div>
        <div className="max-w-3/5 min-w-0 space-y-0.5 text-right">
          {account.balanceValid ? (
            <div className="flex items-baseline justify-end gap-2">
              <span className="truncate text-sm leading-5 font-medium tabular-nums">
                {showNative
                  ? formatCurrency(account.balance, account.currency, true)
                  : formatCurrency(account.toBase, primaryCurrency, true)}
              </span>
              {showNative && (
                <span className="truncate text-xs text-bento-subtle tabular-nums">
                  {formatCurrency(account.toBase, primaryCurrency, true)}
                </span>
              )}
            </div>
          ) : (
            <p className="truncate text-sm leading-5 text-bento-subtle">
              Balance unavailable
            </p>
          )}
          <p className="truncate text-xs leading-5 text-bento-subtle tabular-nums">
            {account.type === "credit" &&
              usage &&
              `${Math.round(usage.percentUsed)}% used · `}
            {updated}
          </p>
        </div>
        <ChevronRight
          aria-hidden="true"
          className="pointer-events-none size-4 shrink-0 text-bento-subtle group-hover/account:text-bento-default"
        />
      </div>
    </li>
  );
}
