"use client";

import type { AccountType } from "@lunch-money/lunch-money-js-v2";
import { AccountRow } from "@/components/investments/account-row";
import { sumBalances, type NormalizedAccount } from "@/lib/account-utils";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Accounts under an institution header, one block per institution. */
export function InstitutionGroups({
  groups,
  primaryCurrency,
  showTotals = false,
  onSaved,
}: {
  groups: [string, NormalizedAccount[]][];
  primaryCurrency: string;
  /** Off for mixed asset/liability lists, where a group total means nothing. */
  showTotals?: boolean;
  onSaved: (id: string, type: AccountType, subtype: string) => void;
}) {
  return groups.map(([institution, accounts], i) => (
    <div
      key={institution}
      className={cn(i > 0 && "border-t border-bento-hairline")}
    >
      <div className="flex items-baseline justify-between bg-bento-raised px-6 py-2">
        <span className="text-xs font-semibold tracking-wide text-bento-subtle uppercase">
          {institution}
        </span>
        {showTotals && (
          <span className="font-mono text-xs font-medium tabular-nums">
            {formatCurrency(sumBalances(accounts), primaryCurrency, true)}
          </span>
        )}
      </div>
      <ul className="flex flex-col px-6">
        {accounts.map((a) => (
          <AccountRow
            key={a.id}
            account={a}
            primaryCurrency={primaryCurrency}
            onSaved={onSaved}
          />
        ))}
      </ul>
    </div>
  ));
}
