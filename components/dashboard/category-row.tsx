"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatAmount, formatCurrency } from "@/lib/format";
import { getCategoryIcon } from "@/lib/lunchmoney/category-icons";
import { UNCATEGORIZED } from "@/lib/lunchmoney/categories";
import { getTransactionsForCategory } from "@/lib/lunchmoney/analytics";
import {
  updateTransactionCategory,
  type Transaction,
} from "@/lib/lunchmoney/client";
import type { CategoryTotal, MoMDelta } from "@/lib/lunchmoney/analytics";
import type { CategoryInfo } from "@/lib/lunchmoney/categories";
import { MoMBadge } from "./mom-badge";

/**
 * The color palette cycled across category rows. Kept here because it's only
 * ever used by this component.
 */
export const CAT_COLORS = [
  "#e85d4a",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
];

/**
 * A single row in the "Spend by Category" list. Clicking it expands to show
 * the top 5 transactions, each of which has an inline category-reassign
 * dropdown.
 *
 * This is a "controlled + local state" mix:
 *  - expanded/editingId/updatingId are purely local (nobody else cares)
 *  - after a category change, we call onCategoryUpdated so the parent can
 *    patch its transaction list (optimistic update)
 */
export function CategoryRow({
  cat,
  color,
  maxSpend,
  delta,
  primaryCurrency,
  transactions,
  categoryMap,
  token,
  onCategoryUpdated,
}: {
  cat: CategoryTotal;
  color: string;
  maxSpend: number;
  delta: MoMDelta | undefined;
  primaryCurrency: string;
  transactions: Transaction[];
  categoryMap: Map<number, CategoryInfo>;
  token: string;
  onCategoryUpdated: (txId: number, newCatId: number | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const Icon = getCategoryIcon(cat.name);
  const topTxs = useMemo(
    () => getTransactionsForCategory(transactions, cat.id),
    [transactions, cat.id]
  );

  async function handleCategoryChange(txId: number, newCatId: number | null) {
    setUpdatingId(txId);
    try {
      await updateTransactionCategory(token, txId, newCatId);
      onCategoryUpdated(txId, newCatId);
    } finally {
      setUpdatingId(null);
      setEditingId(null);
    }
  }

  return (
    <li>
      <button
        className="flex w-full items-center gap-3 rounded-lg px-1 py-1 transition-colors hover:bg-bento-muted/50"
        onClick={() => setExpanded((v) => !v)}
      >
        <div
          className="flex size-7 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}22` }}
        >
          <Icon className="size-3.5" style={{ color }} />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center">
              <span className="truncate text-xs font-medium">{cat.name}</span>
              <MoMBadge delta={delta} />
            </div>
            <span className="ml-3 shrink-0 font-mono text-xs text-bento-subtle tabular-nums">
              {formatCurrency(cat.spend, primaryCurrency, false)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-bento-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: maxSpend > 0 ? `${(cat.spend / maxSpend) * 100}%` : "0%",
                backgroundColor: color,
              }}
            />
          </div>
        </div>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-bento-subtle transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && topTxs.length > 0 && (
        <ul className="mt-1 mb-2 ml-10 flex flex-col gap-0.5 border-l-2 border-bento-hairline pl-3">
          {topTxs.map((tx) => {
            const isEditing = editingId === tx.id;
            const isUpdating = updatingId === tx.id;
            const catInfo =
              tx.category_id != null
                ? (categoryMap.get(tx.category_id) ?? UNCATEGORIZED)
                : UNCATEGORIZED;
            return (
              <li
                key={tx.id}
                className="flex items-center justify-between gap-2 rounded py-1 text-xs"
              >
                <span className="truncate text-bento-subtle">{tx.payee}</span>
                <div className="flex shrink-0 items-center gap-2">
                  {isEditing ? (
                    <Select
                      defaultOpen
                      disabled={isUpdating}
                      defaultValue={
                        tx.category_id != null ? String(tx.category_id) : ""
                      }
                      onValueChange={(val) =>
                        handleCategoryChange(
                          tx.id,
                          val === "" ? null : Number(val)
                        )
                      }
                      onOpenChange={(open) => {
                        if (!open) setEditingId(null);
                      }}
                    >
                      <SelectTrigger size="sm" className="h-6 text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Uncategorized</SelectItem>
                        {Array.from(categoryMap.entries()).map(([id, info]) => (
                          <SelectItem key={id} value={String(id)}>
                            {info.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <button
                      className="text-[11px] text-bento-subtle hover:text-bento-default hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(tx.id);
                      }}
                    >
                      {catInfo.name}
                    </button>
                  )}
                  <span className="font-mono tabular-nums">
                    {formatAmount(parseFloat(tx.amount), true)}
                  </span>
                </div>
              </li>
            );
          })}
          {cat.txCount > 5 && (
            <li className="pt-1">
              <Link
                href="/transactions"
                className="text-[11px] text-bento-subtle hover:text-bento-default hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                +{cat.txCount - 5} more →
              </Link>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
