"use client";

import { memo } from "react";
import { motion } from "motion/react";
import { AnimatedCollapse } from "@/components/animated-collapse";
import { CategoryPicker } from "@/components/transactions/category-picker";
import type { CategoryOption } from "@/components/transactions/category-picker";
import { EditableText } from "@/components/transactions/editable-text";
import { Textarea } from "@/components/ui/textarea";
import { Kbd } from "@/components/ui/kbd";
import { CategoryIcon } from "@/lib/lunchmoney/category-icons";
import { categoryColor } from "@/lib/lunchmoney/category-colors";
import { formatAmount, formatShortDate } from "@/lib/format";
import { DURATION, EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/lib/lunchmoney/client";

export type TransactionRowProps = {
  transaction: Transaction;
  categoryName: string;
  categoryOptions: CategoryOption[];
  expanded: boolean;
  saving: boolean;
  failed: boolean;
  notesDraft: string;
  onToggleExpand: (txId: number) => void;
  onPayeeChange: (txId: number, payee: string) => void;
  onCategoryChange: (txId: number, categoryId: number | null) => void;
  onNotesDraftChange: (value: string) => void;
  onNotesCommit: (txId: number) => void;
  onNotesCancel: (txId: number) => void;
  pickerFinalFocus: () => HTMLElement | boolean | null | void;
};

/**
 * One transaction: description, category, date, amount, and an expandable
 * notes panel.
 *
 * Memoized because the page re-renders on every keystroke in the search box —
 * without this, each character re-rendered every visible row along with its
 * picker and collapse.
 */
export const TransactionRow = memo(function TransactionRow({
  transaction: tx,
  categoryName,
  categoryOptions,
  expanded,
  saving,
  failed,
  notesDraft,
  onToggleExpand,
  onPayeeChange,
  onCategoryChange,
  onNotesDraftChange,
  onNotesCommit,
  onNotesCancel,
  pickerFinalFocus,
}: TransactionRowProps) {
  const payee = tx.payee ?? "";
  const amount = parseFloat(tx.amount);
  const isCredit = amount < 0;
  const color = categoryColor(categoryName);

  const picker = (
    <CategoryPicker
      categoryId={tx.category_id}
      categoryName={categoryName}
      options={categoryOptions}
      saving={saving}
      onChange={(categoryId) => onCategoryChange(tx.id, categoryId)}
      finalFocus={pickerFinalFocus}
    />
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{
        opacity: 0,
        x: -12,
        transition: { duration: DURATION.quick, ease: EASE },
      }}
      transition={{ duration: DURATION.collapse, ease: EASE }}
      data-tx-row
      data-tx-id={tx.id}
      className="transition-colors hover:bg-bento-raised"
    >
      <div
        className="grid cursor-pointer grid-cols-[1fr_80px] items-center gap-4 px-4 py-3 sm:grid-cols-[1fr_160px_72px_96px]"
        onClick={() => onToggleExpand(tx.id)}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: `color-mix(in oklab, ${color} var(--chip-tint), transparent)`,
            }}
          >
            <CategoryIcon
              name={categoryName}
              className="size-4"
              style={{ color }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <EditableText
              value={payee}
              placeholder="Add a description…"
              ariaLabel={
                payee ? `Description: ${payee}. Edit` : "Add a description"
              }
              onCommit={(next) => onPayeeChange(tx.id, next)}
            />
            {!expanded && tx.notes && (
              <p className="truncate px-1.5 text-xs text-bento-subtle">
                {tx.notes}
              </p>
            )}
            <span className="px-1.5 font-mono text-[10px] text-bento-subtle sm:hidden">
              {formatShortDate(tx.date)}
            </span>
            {failed && (
              <p className="px-1.5 text-xs text-bento-negative">
                Couldn&apos;t save — change reverted.
              </p>
            )}
          </div>
        </div>

        <div
          className="hidden min-w-0 sm:block"
          onClick={(e) => e.stopPropagation()}
        >
          {picker}
        </div>

        <span className="hidden text-center text-xs text-bento-subtle tabular-nums sm:block">
          {formatShortDate(tx.date)}
        </span>

        <span
          className={cn(
            "text-right font-mono text-sm font-medium tabular-nums",
            isCredit && "text-bento-positive"
          )}
        >
          {isCredit ? "+" : "−"}
          {formatAmount(Math.abs(amount), true)}
        </span>
      </div>

      <AnimatedCollapse open={expanded}>
        <div
          className="flex flex-col gap-2 border-t border-bento-hairline/50 px-4 pt-2 pb-3"
          onClick={(e) => e.stopPropagation()}
        >
          {/* the row's category cell is hidden on small screens */}
          <div className="sm:hidden">{picker}</div>
          <Textarea
            rows={2}
            placeholder="Add a note…"
            value={notesDraft}
            onChange={(e) => onNotesDraftChange(e.target.value)}
            onBlur={() => onNotesCommit(tx.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onNotesCommit(tx.id);
                onToggleExpand(tx.id); // saves and closes
              } else if (e.key === "Escape") {
                e.preventDefault();
                onNotesCancel(tx.id);
              }
            }}
            autoFocus
            className="resize-none text-sm"
          />
          <p className="text-[11px] text-bento-subtle">
            <Kbd>⌘</Kbd>
            <Kbd>↵</Kbd> to save · <Kbd>esc</Kbd> to cancel
          </p>
        </div>
      </AnimatedCollapse>
    </motion.div>
  );
});
