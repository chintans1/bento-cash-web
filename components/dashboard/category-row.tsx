"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { CategoryIcon } from "@/lib/lunchmoney/category-icons";
import { getTransactionsForCategory } from "@/lib/lunchmoney/analytics";
import { type Transaction } from "@/lib/lunchmoney/client";
import type { CategoryTotal, MoMDelta } from "@/lib/lunchmoney/analytics";
import { MoMBadge } from "./mom-badge";
import { AnimatedCollapse } from "@/components/animated-collapse";

/**
 * One category in the spend breakdown. Every bar starts with the same label
 * allowance, then uses the remaining track to show its share of the largest
 * category. This keeps labels inside the bar without letting their length
 * distort the ordering.
 */
export function CategoryRow({
  cat,
  color,
  maxSpend,
  delta,
  primaryCurrency,
  transactions,
}: {
  cat: CategoryTotal;
  color: string;
  maxSpend: number;
  delta: MoMDelta | undefined;
  primaryCurrency: string;
  transactions: Transaction[];
}) {
  const [expanded, setExpanded] = useState(false);

  const topTxs = useMemo(
    () => getTransactionsForCategory(transactions, cat.id),
    [transactions, cat.id]
  );

  const ratio = maxSpend > 0 ? cat.spend / maxSpend : 0;
  const labelWidthRem = 13;
  const barWidth = `min(100%, calc(${ratio * 100}% + ${labelWidthRem * (1 - ratio)}rem))`;

  return (
    <li>
      <button
        className="grid w-full grid-cols-[minmax(0,1fr)_9rem_1rem] items-center gap-2 rounded-xl px-1 py-1 text-left transition-colors hover:bg-bento-raised"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div
          className="flex h-9 min-w-0 items-center gap-2 rounded-full px-2.5"
          style={{
            width: barWidth,
            backgroundColor: `color-mix(in oklab, ${color} var(--chip-tint), transparent)`,
            boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 30%, transparent)`,
          }}
        >
          <CategoryIcon
            name={cat.name}
            className="size-4 shrink-0"
            style={{ color }}
          />
          <span className="truncate text-xs font-medium">{cat.name}</span>
        </div>

        <div className="flex items-center justify-end gap-2">
          <MoMBadge delta={delta} />
          <span className="font-mono text-xs font-medium tabular-nums">
            {formatCurrency(cat.spend, primaryCurrency, false)}
          </span>
        </div>

        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-bento-subtle transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)]",
            expanded && "rotate-180"
          )}
        />
      </button>

      <AnimatedCollapse open={expanded && topTxs.length > 0}>
        <ul className="mt-1 mb-2 ml-4 flex flex-col gap-0.5 border-l-2 border-bento-hairline pl-3">
          {topTxs.map((tx) => (
            <li
              key={tx.id}
              className="flex items-center justify-between gap-2 rounded py-1 text-xs"
            >
              <span className="truncate text-bento-subtle">{tx.payee}</span>
              <span className="shrink-0 font-mono tabular-nums">
                {formatCurrency(parseFloat(tx.amount), primaryCurrency, true)}
              </span>
            </li>
          ))}
          {cat.txCount > topTxs.length && (
            <li className="pt-1">
              <Link
                href="/transactions"
                className="text-[11px] text-bento-subtle hover:text-bento-default hover:underline"
              >
                +{cat.txCount - topTxs.length} more →
              </Link>
            </li>
          )}
        </ul>
      </AnimatedCollapse>
    </li>
  );
}
