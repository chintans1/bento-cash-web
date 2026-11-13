"use client";

import { useRef, useState, type ReactNode } from "react";
import { Check, ListFilter, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Tag, Transaction } from "@/lib/lunchmoney/client";
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
      <span className="grid size-5 shrink-0 place-items-center rounded-md border border-bento-hairline bg-card text-transparent peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card">
        <Check className="size-3.5" aria-hidden="true" />
      </span>
      {children}
    </label>
  );
}

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
