"use client";

import { useState, type PointerEvent } from "react";
import { type NormalizedAccount, computeNetWorth } from "@/lib/account-utils";
import { assetComposition, type AccountGroupId } from "@/lib/account-groups";
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
  const [hoveredId, setHoveredId] = useState<AccountGroupId | null>(null);
  const [focusedId, setFocusedId] = useState<AccountGroupId | null>(null);
  const { netWorth, totalAssets, totalLiabilities } = computeNetWorth(accounts);
  const composition = assetComposition(accounts);
  const active = composition.find((row) => row.id === (hoveredId ?? focusedId));
  const slices = composition.map((row, index) => {
    const start = composition
      .slice(0, index)
      .reduce((sum, item) => sum + item.percent, 0);
    return { ...row, start, end: start + row.percent };
  });
  const stops = slices.map(({ id, color, start, end }) => {
    const fill =
      active && active.id !== id
        ? `color-mix(in oklab, ${color} 35%, var(--bento-surface))`
        : color;
    return `${fill} ${start}% ${end}%`;
  });
  const compositionTotal = composition.reduce(
    (sum, row) => sum + row.amount,
    0
  );

  function highlightSlice(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || event.target !== event.currentTarget) {
      setHoveredId(null);
      return;
    }

    const { left, top, width, height } =
      event.currentTarget.getBoundingClientRect();
    const x = event.clientX - (left + width / 2);
    const y = event.clientY - (top + height / 2);
    // Conic gradients start at the top and proceed clockwise.
    const percent = ((Math.atan2(x, -y) / (2 * Math.PI) + 1) % 1) * 100;
    setHoveredId(
      (slices.find((slice) => percent < slice.end) ?? slices.at(-1))?.id ?? null
    );
  }

  return (
    <Card className="gap-0 p-5 sm:p-6">
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
      <dl className="mt-6 grid grid-cols-2 gap-4 border-b border-bento-hairline pb-6">
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
      <div className="pt-5">
        <h3 className="text-sm font-semibold">Asset composition</h3>
        {composition.length === 0 ? (
          <p className="mt-4 text-sm text-bento-subtle">
            No positive asset balances to show.
          </p>
        ) : (
          <>
            <div
              className="relative mx-auto my-6 size-36 rounded-full bg-(image:--composition-fill)"
              aria-hidden="true"
              onPointerMove={highlightSlice}
              onPointerLeave={() => setHoveredId(null)}
              style={
                {
                  "--composition-fill": `conic-gradient(${stops.join(", ")})`,
                } as React.CSSProperties
              }
            >
              <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-bento-surface">
                <span className="max-w-24 text-center text-xs leading-tight text-bento-subtle">
                  {active?.label ?? "Total assets"}
                </span>
                <span className="mt-1 text-sm font-semibold tabular-nums">
                  {formatCurrency(
                    active?.amount ?? compositionTotal,
                    primaryCurrency
                  )}
                </span>
              </div>
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
                  onFocus={() => setFocusedId(row.id)}
                  onBlur={() => setFocusedId(null)}
                  className={cn(
                    "-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none",
                    active?.id === row.id && "bg-bento-raised"
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
                    {row.percent.toFixed(1)}%
                  </dd>
                  <dd className="min-w-20 text-right font-medium tabular-nums">
                    {formatCurrency(row.amount, primaryCurrency, true)}
                  </dd>
                </div>
              ))}
            </dl>
            {Math.abs(compositionTotal - totalAssets) > 0.01 && (
              <p className="mt-4 text-xs text-bento-subtle">
                Composition shows positive asset groups. Negative balances are
                included in net worth.
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
