"use client";

import { useRef, useState, type ReactNode } from "react";
import { Check, ListFilter, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Tag, Transaction } from "@/lib/lunchmoney/client";
import { formatCurrency, formatShortDate } from "@/lib/format";
import {
  bulkTransactionPatch,
  type BulkTransactionEdit,
} from "@/lib/lunchmoney/transaction-state";
import { CategoryPicker, type CategoryOption } from "./category-picker";
import { TagPicker } from "./tag-picker";

function EditOption({
  checked,
  disabled,
  onChange,
  children,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-bento-raised has-disabled:cursor-default has-disabled:opacity-60">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="grid size-5 shrink-0 place-items-center rounded-md border border-bento-subtle/65 bg-card text-transparent peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card">
        <Check className="size-3.5" aria-hidden="true" />
      </span>
      {children}
    </label>
  );
}

export function BulkEditDialog({
  transactions,
  visibleIds,
  accountName,
  categories,
  tags,
  onClose,
  onSave,
}: {
  transactions: Transaction[];
  visibleIds: ReadonlySet<number>;
  accountName: (transaction: Transaction) => string | undefined;
  categories: CategoryOption[];
  tags: Tag[];
  onClose: () => void;
  onSave: (edit: BulkTransactionEdit) => Promise<void>;
}) {
  const [categoryId, setCategoryId] = useState<number | null>();
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [markReviewed, setMarkReviewed] = useState(false);
  const [previewLimit, setPreviewLimit] = useState(12);
  const [previewOpen, setPreviewOpen] = useState<boolean>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const savingRef = useRef(false);
  const edit = { categoryId, tagIds, markReviewed };
  const changeCount = transactions.filter(
    (transaction) =>
      Object.keys(bulkTransactionPatch(transaction, edit)).length > 0
  ).length;
  const linkedCount = transactions.filter(
    (transaction) => transaction.recurring_id != null
  ).length;
  const hidden: Transaction[] = [];
  const visible: Transaction[] = [];
  for (const transaction of transactions) {
    (visibleIds.has(transaction.id) ? visible : hidden).push(transaction);
  }
  const preview = [...hidden, ...visible].slice(0, previewLimit);

  async function save() {
    if (savingRef.current || changeCount === 0) return;
    savingRef.current = true;
    setSaving(true);
    setError(undefined);
    try {
      await onSave(edit);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Couldn't update transactions."
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && !savingRef.current && onClose()}
    >
      <DialogTitle className="pr-10 font-heading text-xl font-semibold">
        Edit selected transactions
      </DialogTitle>
      <DialogDescription className="mt-1 text-sm text-bento-subtle">
        {transactions.length} selected for editing
        {hidden.length > 0 && ` · ${hidden.length} hidden from the list`}
      </DialogDescription>
      <details
        open={previewOpen ?? hidden.length > 0}
        onToggle={(event) => setPreviewOpen(event.currentTarget.open)}
        className="mt-4 rounded-2xl border border-bento-hairline"
      >
        <summary className="cursor-pointer rounded-2xl px-3 py-2.5 text-sm font-medium hover:bg-bento-raised">
          Transactions in this edit
        </summary>
        <div className="max-h-48 overflow-y-auto overscroll-contain border-t border-bento-hairline">
          <ul className="divide-y divide-bento-hairline">
            {preview.map((transaction) => (
              <li
                key={transaction.id}
                className="flex items-center gap-3 px-3 py-2 text-xs"
              >
                <div className="min-w-0 grow">
                  <p className="truncate text-sm font-medium">
                    {transaction.payee ||
                      transaction.original_name ||
                      "Unnamed transaction"}
                  </p>
                  <p className="truncate text-bento-subtle">
                    {formatShortDate(transaction.date)}
                    {accountName(transaction) &&
                      ` · ${accountName(transaction)}`}
                  </p>
                </div>
                {!visibleIds.has(transaction.id) && (
                  <span className="rounded-md bg-bento-raised px-1.5 py-0.5 text-bento-subtle">
                    Hidden
                  </span>
                )}
                <span className="shrink-0 tabular-nums">
                  {formatCurrency(
                    Number(transaction.amount),
                    transaction.currency,
                    true
                  )}
                </span>
              </li>
            ))}
          </ul>
          {previewLimit < transactions.length && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="m-1.5"
              onClick={() => setPreviewLimit((limit) => limit + 12)}
            >
              Show more selected transactions
            </Button>
          )}
        </div>
      </details>
      <form
        className="mt-5 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="space-y-2 rounded-2xl border border-bento-hairline p-1.5">
          <EditOption
            checked={categoryId !== undefined}
            disabled={saving || linkedCount === transactions.length}
            onChange={(checked) => setCategoryId(checked ? null : undefined)}
          >
            Set category
            <ListFilter
              className="ml-auto size-4 text-bento-subtle"
              aria-hidden="true"
            />
          </EditOption>
          {categoryId !== undefined && (
            <CategoryPicker
              categoryId={categoryId}
              categoryName={
                categories.find(
                  (category) => category.id === (categoryId ?? -1)
                )?.name ?? "Uncategorized"
              }
              options={categories}
              onChange={setCategoryId}
              disabled={saving}
              appearance="field"
            />
          )}
          {linkedCount > 0 && (
            <p className="px-3 pb-1 text-xs text-bento-subtle">
              Recurring transactions keep their existing category.
            </p>
          )}
        </div>
        <div className="space-y-2 rounded-2xl border border-bento-hairline p-2">
          <p className="flex min-h-7 items-center justify-between gap-3 px-2 text-sm font-medium">
            Tags to add{" "}
            <TagIcon className="size-4 text-bento-subtle" aria-hidden="true" />
          </p>
          <TagPicker
            tags={tags}
            value={tagIds}
            disabled={saving}
            onChange={setTagIds}
          />
        </div>
        <div className="rounded-2xl border border-bento-hairline p-1.5">
          <EditOption
            checked={markReviewed}
            disabled={saving}
            onChange={setMarkReviewed}
          >
            Mark as reviewed
          </EditOption>
        </div>
        {error && (
          <p role="alert" className="text-sm text-bento-negative">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-bento-hairline pt-4">
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving || changeCount === 0}>
            {saving
              ? "Saving…"
              : changeCount === 0
                ? "Apply changes"
                : `Update ${changeCount} ${changeCount === 1 ? "transaction" : "transactions"}`}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
