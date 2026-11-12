"use client";

import { memo } from "react";
import {
  AlertTriangle,
  Check,
  Circle,
  Clock3,
  LockKeyhole,
  Repeat2,
} from "lucide-react";
import { CategoryPicker, type CategoryOption } from "./category-picker";
import { EditableText } from "./editable-text";
import { TagPicker } from "./tag-picker";
import { CategoryIcon } from "@/lib/lunchmoney/category-icons";
import { categoryColor } from "@/lib/lunchmoney/category-colors";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Tag, Transaction } from "@/lib/lunchmoney/client";
import type { RecurringMatch } from "@/lib/lunchmoney/recurring-match";
import {
  isReviewableTransaction,
  isStructurallyLockedTransaction,
} from "@/lib/lunchmoney/transaction-state";
import { canGroupTransaction } from "@/lib/lunchmoney/transaction-structure";

export const TRANSACTION_GRID_COLUMNS =
  "grid-cols-transaction @2xl/ledger:grid-cols-transaction-sm @3xl/ledger:grid-cols-transaction-md";

export type TransactionRowProps = {
  transaction: Transaction;
  categoryName: string;
  accountName?: string;
  recurringMatch: RecurringMatch;
  categoryOptions: CategoryOption[];
  tags: Tag[];
  payeeSuggestions: string[];
  saving: boolean;
  error?: string;
  selected: boolean;
  onSelect: (id: number, selected: boolean) => void;
  onOpen: (id: number) => void;
  onPayeeChange: (id: number, payee: string) => void;
  onCategoryChange: (id: number, categoryId: number | null) => void | false;
  onTagsChange: (id: number, tags: number[]) => void;
  onReview: (id: number, reviewed: boolean) => void;
};

export const TransactionRow = memo(function TransactionRow({
  transaction: tx,
  categoryName,
  accountName,
  recurringMatch,
  categoryOptions,
  tags,
  payeeSuggestions,
  saving,
  error,
  selected,
  onSelect,
  onOpen,
  onPayeeChange,
  onCategoryChange,
  onTagsChange,
  onReview,
}: TransactionRowProps) {
  const payee = tx.payee ?? "";
  const date = formatShortDate(tx.date);
  const amount = parseFloat(tx.amount);
  const isCredit = amount < 0;
  const color = categoryColor(categoryName);
  const structurallyLocked = isStructurallyLockedTransaction(tx);
  const canReview = isReviewableTransaction(tx);
  const canSelect = canReview || canGroupTransaction(tx);
  const reviewed = tx.status === "reviewed";
  const unreviewed = tx.status === "unreviewed" && !tx.is_pending;
  const usesCategoryColor =
    reviewed ||
    structurallyLocked ||
    tx.status === "delete_pending" ||
    tx.category_id == null;

  return (
    <div
      aria-busy={saving}
      data-tx-row
      data-tx-id={tx.id}
      className={cn(
        "group/row cursor-pointer transition-row focus-within:bg-bento-raised hover:bg-bento-raised",
        tx.is_pending && !structurallyLocked && "opacity-70 hover:opacity-100",
        selected && "bg-bento-raised"
      )}
      onClick={(event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (!event.currentTarget.contains(target)) return;
        if (target.closest("button, input, textarea, select, a")) return;
        onOpen(tx.id);
      }}
    >
      <div
        className={cn(
          "grid items-center gap-x-1 px-2 py-0.5 @2xl/ledger:gap-x-2",
          TRANSACTION_GRID_COLUMNS
        )}
      >
        {tx.is_pending ? (
          <span
            className="flex size-8 items-center justify-center text-bento-subtle"
            title="Pending"
          >
            <Clock3 className="size-3.5" aria-hidden="true" />
            <span className="sr-only">Pending</span>
          </span>
        ) : canSelect ? (
          <button
            type="button"
            aria-label={`${selected ? "Deselect" : "Select"} ${payee || "transaction"}`}
            aria-pressed={selected}
            className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-bento-raised focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
            onClick={() => onSelect(tx.id, !selected)}
          >
            <span
              className={cn(
                "flex size-3.5 items-center justify-center rounded border transition-editable",
                selected
                  ? "border-bento-brand bg-bento-brand text-bento-brand-fg"
                  : "border-bento-hairline"
              )}
            >
              {selected && <Check className="size-3" />}
            </span>
          </button>
        ) : (
          <span aria-hidden="true" className="size-8" />
        )}

        <div className="flex min-w-0 items-center gap-0.5">
          <button
            type="button"
            data-tx-details
            aria-label={`Open details for ${payee || "transaction"}`}
            onClick={() => onOpen(tx.id)}
            className="pointer-press group/details flex size-8 shrink-0 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
            style={{ "--item-color": color } as React.CSSProperties}
          >
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full transition-category group-hover/details:shadow-(--shadow-category-outline)",
                usesCategoryColor ? "bg-item-tint" : "bg-bento-muted"
              )}
            >
              <CategoryIcon
                name={categoryName}
                className="size-3.5 text-(--item-color)"
                style={
                  {
                    "--item-color": usesCategoryColor
                      ? color
                      : "var(--bento-subtle)",
                  } as React.CSSProperties
                }
              />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              {structurallyLocked ? (
                <span
                  title={payee}
                  className="min-w-0 truncate px-1.5 py-0.5 text-sm font-medium text-bento-default"
                >
                  {payee || "Transaction"}
                </span>
              ) : (
                <EditableText
                  value={payee}
                  className="w-auto max-w-full min-w-0 @2xl/ledger:min-h-7"
                  inputClassName="@2xl/ledger:h-7"
                  placeholder="Add a description…"
                  suggestions={payeeSuggestions}
                  ariaLabel={
                    payee ? `Description: ${payee}. Edit` : "Add a description"
                  }
                  disabled={saving}
                  onCommit={(next) => onPayeeChange(tx.id, next)}
                />
              )}
              {structurallyLocked && (
                <LockKeyhole
                  role="img"
                  aria-label="Read-only"
                  className="size-3 shrink-0 text-bento-subtle"
                />
              )}
              {tx.status === "delete_pending" && (
                <AlertTriangle
                  aria-label="Needs attention"
                  className="size-3.5 shrink-0 text-bento-danger"
                />
              )}
              {tx.is_group_parent && <Badge variant="secondary">Group</Badge>}
              {tx.split_parent_id != null && (
                <Badge variant="secondary">Split</Badge>
              )}
              {recurringMatch === "confirmed" && (
                <Repeat2
                  role="img"
                  aria-label="Recurring"
                  className="size-3.5 shrink-0 text-bento-subtle"
                />
              )}
              <span className="ml-auto shrink-0 text-xs text-bento-subtle tabular-nums @2xl/ledger:hidden">
                {date}
              </span>
            </div>
            {accountName && (
              <span
                title={accountName}
                className="hidden truncate px-1.5 text-xs leading-4 text-bento-subtle @2xl/ledger:block"
              >
                {accountName}
              </span>
            )}
            {error && (
              <p role="alert" className="px-1.5 text-xs text-bento-negative">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="col-span-3 col-start-2 row-start-2 flex min-w-0 items-center gap-2 @2xl/ledger:contents">
          {accountName && (
            <span
              title={accountName}
              className="min-w-0 flex-3 truncate pl-1.5 text-xs text-bento-subtle @2xl/ledger:hidden"
            >
              {accountName}
            </span>
          )}
          <div className="min-w-0 flex-2 @2xl/ledger:col-start-3 @2xl/ledger:row-start-1">
            {structurallyLocked ? (
              <span className="block truncate px-2 text-xs text-bento-default">
                {categoryName}
              </span>
            ) : (
              <CategoryPicker
                categoryId={tx.category_id}
                categoryName={categoryName}
                options={
                  tx.split_parent_id != null && tx.recurring_id == null
                    ? categoryOptions.filter((option) => option.id !== -1)
                    : categoryOptions
                }
                saving={saving}
                onChange={(categoryId) => onCategoryChange(tx.id, categoryId)}
              />
            )}
          </div>

          <span className="hidden text-center text-xs text-bento-subtle tabular-nums @2xl/ledger:col-start-4 @2xl/ledger:row-start-1 @2xl/ledger:block">
            {date}
          </span>

          <span
            className={cn(
              "shrink-0 justify-self-end text-right font-mono text-xs font-medium whitespace-nowrap tabular-nums @2xl/ledger:col-start-5 @2xl/ledger:row-start-1 @2xl/ledger:text-sm",
              isCredit && !tx.is_pending && "text-bento-positive"
            )}
          >
            {isCredit ? "+" : "−"}
            {formatCurrency(Math.abs(amount), tx.currency, true)}
          </span>
        </div>
        <div className="col-start-3 row-start-1 @2xl/ledger:col-start-6">
          {(!structurallyLocked || tx.tag_ids.length > 0) && (
            <TagPicker
              appearance="cell"
              tags={tags}
              value={tx.tag_ids}
              disabled={structurallyLocked}
              saving={saving}
              onChange={(ids) => onTagsChange(tx.id, ids)}
            />
          )}
        </div>
        <div className="col-start-4 row-start-1 @2xl/ledger:col-start-7">
          {tx.is_pending ? (
            <span aria-hidden="true" className="size-8" />
          ) : structurallyLocked ? (
            <span
              className="flex size-8 items-center justify-center"
              title={reviewed ? "Reviewed · read-only" : "Read-only"}
            >
              {reviewed ? (
                <Check
                  aria-hidden="true"
                  className="size-3.5 text-bento-positive"
                />
              ) : (
                <LockKeyhole
                  aria-hidden="true"
                  className="size-3.5 text-bento-subtle"
                />
              )}
              <span className="sr-only">
                {reviewed ? "Reviewed, read-only" : "Read-only"}
              </span>
            </span>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canReview || saving}
              aria-label={reviewed ? "Mark unreviewed" : "Mark reviewed"}
              onClick={() => onReview(tx.id, !reviewed)}
              className={cn(
                reviewed && "text-bento-positive hover:text-bento-positive",
                unreviewed && "text-bento-subtle hover:text-bento-default"
              )}
            >
              {reviewed ? (
                <Check className="size-3.5" />
              ) : (
                <Circle className="size-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});
