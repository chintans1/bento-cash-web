"use client";

import { CompositionBreakdown } from "@/components/ui/composition-breakdown";
import {
  SummaryAmount,
  SummaryCard,
  SummaryTotals,
} from "@/components/ui/summary-card";
import { type NormalizedAccount, computeNetWorth } from "@/lib/account-utils";
import { assetComposition, liabilityComposition } from "@/lib/account-groups";

export function AccountSummary({
  accounts,
  primaryCurrency,
}: {
  accounts: NormalizedAccount[];
  primaryCurrency: string;
}) {
  const { netWorth, totalAssets, totalLiabilities } = computeNetWorth(accounts);
  return (
    <SummaryCard>
      <SummaryAmount
        label="Net worth"
        amount={netWorth}
        primaryCurrency={primaryCurrency}
      />
      <SummaryTotals
        first={{ label: "Assets", amount: totalAssets }}
        second={{ label: "Liabilities", amount: totalLiabilities }}
        primaryCurrency={primaryCurrency}
      />
      <AccountComposition
        composition={assetComposition(accounts)}
        total={totalAssets}
        primaryCurrency={primaryCurrency}
      />
      <AccountComposition
        composition={liabilityComposition(accounts)}
        total={totalLiabilities}
        primaryCurrency={primaryCurrency}
        isLiability
      />
    </SummaryCard>
  );
}

function AccountComposition({
  composition,
  total,
  primaryCurrency,
  isLiability = false,
}: {
  composition: ReturnType<typeof assetComposition>;
  total: number;
  primaryCurrency: string;
  isLiability?: boolean;
}) {
  const compositionTotal = composition.reduce(
    (sum, row) => sum + row.amount,
    0
  );

  return (
    <CompositionBreakdown
      title={isLiability ? "Liability composition" : "Asset composition"}
      entries={composition}
      primaryCurrency={primaryCurrency}
      separated={isLiability}
      emptyMessage={
        isLiability
          ? "No outstanding liabilities."
          : "No positive asset balances to show."
      }
      footer={
        composition.length > 0 &&
        Math.abs(compositionTotal - total) > 0.01 && (
          <p className="mt-4 text-xs text-bento-subtle">
            {isLiability
              ? "Shares use positive liability groups. Credit balances are included in net worth."
              : "Shares use positive asset groups. Negative balances are included in net worth."}
          </p>
        )
      }
    />
  );
}
