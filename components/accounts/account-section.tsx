"use client";

import {
  Building2,
  CreditCard,
  Landmark,
  Wallet,
  ChartNoAxesCombined,
  House,
  HandCoins,
  PiggyBank,
} from "lucide-react";
import type { NormalizedAccount } from "@/lib/account-utils";
import { formatCurrency } from "@/lib/format";
import { AccountRow } from "./account-row";

const GROUP_ICONS = {
  checking: Wallet,
  savings: PiggyBank,
  "other-cash": Wallet,
  "other-assets": House,
  credit: CreditCard,
  loans: Landmark,
  "other-liabilities": HandCoins,
};

export function AccountSection({
  title,
  groupId,
  accounts,
  total,
  primaryCurrency,
  isLiability = false,
  byInstitution = false,
  onSelect,
}: {
  title: string;
  groupId: string;
  accounts: NormalizedAccount[];
  total: number;
  primaryCurrency: string;
  isLiability?: boolean;
  byInstitution?: boolean;
  onSelect: (account: NormalizedAccount, trigger: HTMLButtonElement) => void;
}) {
  const groupIcon = GROUP_ICONS[groupId as keyof typeof GROUP_ICONS];
  const Icon = byInstitution ? Building2 : (groupIcon ?? ChartNoAxesCombined);

  return (
    <section
      aria-label={title}
      className="border-b border-bento-hairline last:border-0"
    >
      <div className="flex items-center gap-3 bg-bento-raised/50 px-(--card-spacing) py-panel-row">
        <Icon
          className="size-4 shrink-0 text-bento-subtle"
          strokeWidth={1.7}
          aria-hidden="true"
        />
        <h2 className="min-w-0 flex-1 text-sm font-semibold">
          {title}{" "}
          <span className="ml-1 text-xs font-normal text-bento-subtle">
            {accounts.length}
          </span>
        </h2>
        <p className="shrink-0 pr-6 text-right text-sm font-medium tabular-nums">
          {formatCurrency(total, primaryCurrency, true)}
          {isLiability && (
            <span className="ml-1 text-xs font-normal text-bento-subtle">
              owed
            </span>
          )}
        </p>
      </div>
      <ul className="px-(--card-spacing)">
        {accounts.map((account) => (
          <AccountRow
            key={account.id}
            account={account}
            primaryCurrency={primaryCurrency}
            byInstitution={byInstitution}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </section>
  );
}
