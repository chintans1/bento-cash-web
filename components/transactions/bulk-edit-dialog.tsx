"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Tag, Transaction } from "@/lib/lunchmoney/client";
import {
  bulkTransactionPatch,
  type BulkTransactionEdit,
} from "@/lib/lunchmoney/transaction-state";
import { CategoryPicker, type CategoryOption } from "./category-picker";
import { TagPicker } from "./tag-picker";

export function BulkEditDialog({
  transactions,
  categories,
  tags,
  onClose,
  onSave,
}: {
  transactions: Transaction[];
  categories: CategoryOption[];
  tags: Tag[];
  onClose: () => void;
  onSave: (edit: BulkTransactionEdit) => Promise<void>;
}) {
  const [categoryId, setCategoryId] = useState<number | null>();
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [markReviewed, setMarkReviewed] = useState(false);
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
        {transactions.length} selected
      </DialogDescription>
      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="space-y-2">
          <label className="flex min-h-8 items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={categoryId !== undefined}
              disabled={saving || linkedCount === transactions.length}
              onChange={(event) =>
                setCategoryId(event.target.checked ? null : undefined)
              }
            />
            Set category
          </label>
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
            <p className="text-xs text-bento-subtle">
              Recurring transactions keep their existing category.
            </p>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Tags to add</p>
          <TagPicker
            tags={tags}
            value={tagIds}
            disabled={saving}
            onChange={setTagIds}
          />
        </div>
        <label className="flex min-h-8 items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={markReviewed}
            disabled={saving}
            onChange={(event) => setMarkReviewed(event.target.checked)}
          />
          Mark as reviewed
        </label>
        {error && (
          <p role="alert" className="text-sm text-bento-negative">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
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
