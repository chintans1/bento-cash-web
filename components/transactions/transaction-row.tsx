"use client";

import { memo } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Circle,
  Clock3,
} from "lucide-react";
import { CategoryPicker, type CategoryOption } from "./category-picker";
import { EditableText } from "./editable-text";
import { CategoryIcon } from "@/lib/lunchmoney/category-icons";
import { categoryColor } from "@/lib/lunchmoney/category-colors";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/lib/lunchmoney/client";

export const TRANSACTION_GRID_COLUMNS =
  "grid-cols-[40px_minmax(0,1fr)_40px_24px] sm:grid-cols-[40px_minmax(0,1fr)_160px_72px_96px_40px_24px] md:grid-cols-[40px_minmax(0,1fr)_220px_72px_96px_40px_24px] lg:grid-cols-[40px_minmax(0,1fr)_260px_72px_96px_40px_24px]";

export type TransactionRowProps = {
  transaction: Transaction;
  categoryName: string;
  accountName?: string;
  primaryCurrency: string;
  categoryOptions: CategoryOption[];
  payeeSuggestions: string[];
  saving: boolean;
  error?: string;
  selected: boolean;
  onSelect: (id: number, selected: boolean) => void;
  onOpen: (id: number) => void;
  onPayeeChange: (id: number, payee: string) => void;
  onCategoryChange: (id: number, categoryId: number | null) => void;
  onReview: (id: number, reviewed: boolean) => void;
  pickerFinalFocus: () => HTMLElement | boolean | null | void;
};

export const TransactionRow = memo(function TransactionRow({
  transaction: tx,
  categoryName,
  accountName,
  primaryCurrency,
  categoryOptions,
  payeeSuggestions,
  saving,
  error,
  selected,
  onSelect,
  onOpen,
  onPayeeChange,
  onCategoryChange,
  onReview,
  pickerFinalFocus,
}: TransactionRowProps) {
  const payee = tx.payee ?? "";
  const amount = parseFloat(tx.amount);
  const isCredit = amount < 0;
  const color = categoryColor(categoryName);
  const canReview = !tx.is_pending && tx.status !== "delete_pending";
  const reviewed = tx.status === "reviewed";
  const unreviewed = tx.status === "unreviewed" && !tx.is_pending;
  const usesCategoryColor =
    tx.category_id == null || reviewed || tx.status === "delete_pending";

  return (
    <div
      data-tx-row
      data-tx-id={tx.id}
      className={cn(
        "group/row cursor-pointer transition-[background-color,opacity] focus-within:bg-bento-raised hover:bg-bento-raised",
        tx.is_pending && "opacity-70 hover:opacity-100",
        selected && "bg-bento-raised"
      )}
      onClick={(event) => {
        const target = event.target as Element;
        if (!event.currentTarget.contains(target)) return;
        if (target.closest("button, input, textarea, select, a")) return;
        onOpen(tx.id);
      }}
    >
      <div
        className={cn(
          "grid items-center gap-2 px-3 py-2",
          TRANSACTION_GRID_COLUMNS
        )}
      >
        {tx.is_pending ? (
          <span
            className="flex size-10 items-center justify-center text-bento-subtle"
            title="Pending"
          >
            <Clock3 className="size-4" aria-hidden="true" />
            <span className="sr-only">Pending</span>
          </span>
        ) : (
          <button
            type="button"
            aria-label={`${selected ? "Deselect" : "Select"} ${payee || "transaction"}`}
            aria-pressed={selected}
            disabled={!canReview || reviewed}
            className="flex size-10 items-center justify-center rounded-full transition-colors hover:bg-bento-raised focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
            onClick={() => onSelect(tx.id, !selected)}
          >
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded border transition-[color,background-color,border-color]",
                selected
                  ? "border-bento-brand bg-bento-brand text-bento-brand-fg"
                  : "border-bento-hairline"
              )}
            >
              {selected && <Check className="size-3" />}
            </span>
          </button>
        )}

        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label={`Open details for ${payee || "transaction"}`}
            onClick={() => onOpen(tx.id)}
            className="flex size-10 shrink-0 items-center justify-center rounded-full transition-[box-shadow,scale] group-hover/row:shadow-[0_0_0_2px_var(--bento-hairline)] hover:shadow-[0_0_0_2px_var(--bento-hairline)] focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none active:scale-[0.96]"
            style={{
              backgroundColor: usesCategoryColor
                ? `color-mix(in oklab, ${color} var(--chip-tint), transparent)`
                : "var(--bento-muted)",
            }}
          >
            <CategoryIcon
              name={categoryName}
              className="size-4"
              style={{
                color: usesCategoryColor ? color : "var(--bento-subtle)",
              }}
            />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <EditableText
                value={payee}
                className="w-auto max-w-full min-w-0"
                placeholder="Add a description…"
                suggestions={payeeSuggestions}
                ariaLabel={
                  payee ? `Description: ${payee}. Edit` : "Add a description"
                }
                onCommit={(next) => onPayeeChange(tx.id, next)}
              />
              {tx.status === "delete_pending" && (
                <AlertTriangle
                  aria-label="Needs attention"
                  className="size-3.5 shrink-0 text-bento-danger"
                />
              )}
            </div>
            <div className="flex min-w-0 items-center gap-2 px-1.5">
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-xs text-bento-subtle hover:text-bento-default"
                onClick={() => onOpen(tx.id)}
              >
                {tx.notes || accountName || "View details"}
              </button>
              <span className="shrink-0 font-mono text-[10px] text-bento-subtle tabular-nums sm:hidden">
                {formatShortDate(tx.date)}
              </span>
            </div>
            {error && (
              <p role="alert" className="px-1.5 text-xs text-bento-negative">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="hidden min-w-0 sm:block">
          <CategoryPicker
            categoryId={tx.category_id}
            categoryName={categoryName}
            options={categoryOptions}
            saving={saving}
            onChange={(categoryId) => onCategoryChange(tx.id, categoryId)}
            finalFocus={pickerFinalFocus}
          />
        </div>

        <span className="hidden text-center text-xs text-bento-subtle tabular-nums sm:block">
          {formatShortDate(tx.date)}
        </span>

        <span
          className={cn(
            "hidden text-right font-mono text-sm font-medium tabular-nums sm:block",
            isCredit && !tx.is_pending && "text-bento-positive"
          )}
        >
          {isCredit ? "+" : "−"}
          {formatCurrency(Math.abs(amount), primaryCurrency, true)}
        </span>
        {tx.is_pending ? (
          <span aria-hidden="true" className="size-10" />
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            disabled={!canReview || saving}
            aria-label={reviewed ? "Mark unreviewed" : "Mark reviewed"}
            onClick={() => onReview(tx.id, !reviewed)}
            className={cn(
              unreviewed && "text-bento-subtle hover:text-bento-default"
            )}
          >
            {reviewed ? (
              <Check className="size-4" />
            ) : (
              <Circle className="size-4" />
            )}
          </Button>
        )}
        <ChevronRight
          aria-hidden="true"
          className="size-4 text-bento-subtle transition-colors group-hover/row:text-bento-default"
        />
      </div>

      <div className="px-4 pb-2 sm:hidden">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <CategoryPicker
              categoryId={tx.category_id}
              categoryName={categoryName}
              options={categoryOptions}
              saving={saving}
              onChange={(categoryId) => onCategoryChange(tx.id, categoryId)}
              finalFocus={pickerFinalFocus}
            />
          </div>
          {tx.split_parent_id != null && (
            <Badge variant="secondary">Split</Badge>
          )}
          <span
            className={cn(
              "shrink-0 text-right font-mono text-sm font-medium tabular-nums",
              isCredit && !tx.is_pending && "text-bento-positive"
            )}
          >
            {isCredit ? "+" : "−"}
            {formatCurrency(Math.abs(amount), primaryCurrency, true)}
          </span>
        </div>
      </div>
    </div>
  );
});
