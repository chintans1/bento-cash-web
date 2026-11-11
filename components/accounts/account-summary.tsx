"use client";

import { useState } from "react";
import { type NormalizedAccount, computeNetWorth } from "@/lib/account-utils";
import {
  assetComposition,
  liabilityComposition,
  type AccountGroupId,
} from "@/lib/account-groups";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function AccountSummary({
  accounts,
  primaryCurrency,
}: {
  accounts: NormalizedAccount[];
  primaryCurrency: string;
}) {
  const { netWorth, totalAssets, totalLiabilities } = computeNetWorth(accounts);
  return (
    <Card className="gap-0 px-(--card-spacing)">
      <div>
        <h3 className="text-sm text-bento-subtle">Net worth</h3>
        <p
          className={cn(
            "mt-2 font-heading text-4xl font-semibold tracking-tight tabular-nums",
            netWorth < 0 && "text-bento-negative"
          )}
        >
          {formatCurrency(netWorth, primaryCurrency, true)}
        </p>
      </div>
      <dl className="mt-panel grid grid-cols-2 gap-4 border-b border-bento-hairline pb-panel">
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-bento-subtle">
            <span className="size-1.5 rounded-full bg-bento-positive" />
            Assets
          </dt>
          <dd className="mt-1.5 text-base font-medium tabular-nums">
            {formatCurrency(totalAssets, primaryCurrency, true)}
          </dd>
        </div>
        <div className="border-l border-bento-hairline pl-4">
          <dt className="flex items-center gap-1.5 text-xs text-bento-subtle">
            <span className="size-1.5 rounded-full bg-bento-negative" />
            Liabilities
          </dt>
          <dd className="mt-1.5 text-base font-medium tabular-nums">
            {formatCurrency(totalLiabilities, primaryCurrency, true)}
          </dd>
        </div>
      </dl>
      <CompositionBreakdown
        composition={assetComposition(accounts)}
        total={totalAssets}
        primaryCurrency={primaryCurrency}
      />
      <CompositionBreakdown
        composition={liabilityComposition(accounts)}
        total={totalLiabilities}
        primaryCurrency={primaryCurrency}
        isLiability
      />
    </Card>
  );
}

function CompositionBreakdown({
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
  const [hoveredId, setHoveredId] = useState<AccountGroupId | null>(null);
  const [focusedId, setFocusedId] = useState<AccountGroupId | null>(null);
  const activeId = hoveredId ?? focusedId;
  const compositionTotal = composition.reduce(
    (sum, row) => sum + row.amount,
    0
  );

  return (
    <section
      className={cn(
        "pt-panel",
        isLiability && "mt-panel border-t border-bento-hairline"
      )}
    >
      <h3 className="text-sm font-semibold">
        {isLiability ? "Liability composition" : "Asset composition"}
      </h3>
      {composition.length === 0 ? (
        <p className="mt-4 text-sm text-bento-subtle">
          {isLiability
            ? "No outstanding liabilities."
            : "No positive asset balances to show."}
        </p>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="mt-3 mb-2 flex h-3 gap-px overflow-hidden rounded-full bg-bento-raised"
            onPointerLeave={() => setHoveredId(null)}
          >
            {composition.map((row) => (
              <div
                key={row.id}
                onPointerEnter={(event) => {
                  if (event.pointerType !== "touch") setHoveredId(row.id);
                }}
                className={cn(
                  "w-(--segment-width) bg-(--segment-color) transition-opacity motion-reduce:transition-none",
                  activeId && activeId !== row.id && "opacity-35"
                )}
                style={
                  {
                    "--segment-width": `${row.percent}%`,
                    "--segment-color": row.color,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
          <dl className="space-y-0.5">
            {composition.map((row) => (
              <div
                key={row.id}
                tabIndex={0}
                onPointerEnter={(event) => {
                  if (event.pointerType !== "touch") setHoveredId(row.id);
                }}
                onPointerLeave={() => setHoveredId(null)}
                onFocus={() => {
                  setHoveredId(null);
                  setFocusedId(row.id);
                }}
                onBlur={() => setFocusedId(null)}
                className={cn(
                  "-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none",
                  activeId === row.id && "bg-bento-raised"
                )}
              >
                <dt className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span
                    className="size-2 shrink-0 rounded-full bg-(--item-background)"
                    style={
                      {
                        "--item-background": row.color,
                      } as React.CSSProperties
                    }
                  />
                  {row.label}
                </dt>
                <dd className="text-bento-subtle tabular-nums">
                  {row.percent < 0.05 ? "<0.1%" : `${row.percent.toFixed(1)}%`}
                </dd>
                <dd className="min-w-20 text-right font-medium tabular-nums">
                  {formatCurrency(row.amount, primaryCurrency, true)}
                </dd>
              </div>
            ))}
          </dl>
          {Math.abs(compositionTotal - total) > 0.01 && (
            <p className="mt-4 text-xs text-bento-subtle">
              {isLiability
                ? "Shares use positive liability groups. Credit balances are included in net worth."
                : "Shares use positive asset groups. Negative balances are included in net worth."}
            </p>
          )}
        </>
      )}
    </section>
  );
}
