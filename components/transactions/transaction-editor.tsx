"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Clock3, X } from "lucide-react";
import type { RecurringItem, Tag, Transaction } from "@/lib/lunchmoney/client";
import type { NormalizedAccount } from "@/lib/account-utils";
import {
  changedPatch,
  isStructurallyLockedTransaction,
  isTransactionAccountOption,
  transactionAccountPatch,
  type TransactionPatch,
} from "@/lib/lunchmoney/transaction-state";
import type { CategoryOption } from "./category-picker";
import { CategoryPicker } from "./category-picker";
import { TagPicker } from "./tag-picker";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatCurrency, formatShortDate } from "@/lib/format";

type Draft = {
  payee: string;
  date: string;
  amount: string;
  currency: string;
  categoryId: number | null;
  account: string;
  recurringId: string;
  tagIds: number[];
  notes: string;
  status: Transaction["status"];
};

function accountValue(transaction: Transaction) {
  if (transaction.manual_account_id != null) {
    return `manual-${transaction.manual_account_id}`;
  }
  if (transaction.plaid_account_id != null) {
    return `plaid-${transaction.plaid_account_id}`;
  }
  return "cash";
}

function makeDraft(transaction: Transaction): Draft {
  return {
    payee: transaction.payee ?? "",
    date: transaction.date,
    amount: transaction.amount,
    currency: transaction.currency.toUpperCase(),
    categoryId: transaction.category_id,
    account: accountValue(transaction),
    recurringId: transaction.recurring_id?.toString() ?? "none",
    tagIds: transaction.tag_ids,
    notes: transaction.notes ?? "",
    status: transaction.status,
  };
}

function recurringName(item: RecurringItem) {
  return (
    item.transaction_criteria.payee ?? item.description ?? "Recurring item"
  );
}

function recurringValueName(items: RecurringItem[], value: string) {
  if (value === "none") return "Not recurring";
  const item = items.find(({ id }) => id === Number(value));
  return item ? recurringName(item) : `Recurring item #${value}`;
}

export function TransactionEditor({
  transaction,
  categoryOptions,
  accounts,
  tags,
  recurringItems,
  saving,
  error,
  onClose,
  onSave,
}: {
  transaction: Transaction;
  categoryOptions: CategoryOption[];
  accounts: NormalizedAccount[];
  tags: Tag[];
  recurringItems: RecurringItem[];
  saving: boolean;
  error?: string;
  onClose: () => void;
  onSave: (patch: TransactionPatch) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(true);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [draft, setDraft] = useState(() => makeDraft(transaction));

  function updateDraft<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  const currentAccount = accounts.find(
    (account) => account.id === accountValue(transaction)
  );
  const locked = currentAccount?.allowTransactionModifications === false;
  const structurallyLocked = isStructurallyLockedTransaction(transaction);

  const patch = useMemo(() => {
    const selectedAccount = accounts.find(
      (account) => account.id === draft.account
    );
    return changedPatch(transaction, {
      payee: draft.payee.trim(),
      date: draft.date,
      amount: draft.amount,
      currency: draft.currency.toLowerCase() as Transaction["currency"],
      category_id: draft.categoryId,
      ...(draft.account === accountValue(transaction)
        ? {}
        : transactionAccountPatch(selectedAccount)),
      recurring_id:
        draft.recurringId === "none" ? null : Number(draft.recurringId),
      tag_ids: draft.tagIds,
      notes: draft.notes.trim() || null,
      ...(draft.status === "delete_pending" ? {} : { status: draft.status }),
    });
  }, [accounts, draft, transaction]);

  const amountValid = /^-?\d+(\.\d{1,4})?$/.test(draft.amount);
  const currencyValid = /^[A-Za-z]{3}$/.test(draft.currency);
  const valid = draft.date !== "" && amountValid && currencyValid;
  const categoryName =
    categoryOptions.find((option) => option.id === (draft.categoryId ?? -1))
      ?.name ?? "Uncategorized";
  const changed = Object.keys(patch).length > 0;
  const amount = Number(draft.amount);

  async function save() {
    if (!valid || !changed || saving) return;
    if (await onSave(patch)) setOpen(false);
  }

  function requestClose() {
    if (saving) return;
    if (changed) setConfirmDiscard(true);
    else setOpen(false);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && requestClose()}
      onOpenChangeComplete={(next) => !next && onClose()}
    >
      <SheetContent
        showCloseButton={false}
        className="overflow-hidden bg-card text-card-foreground data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        <form
          className="flex h-full flex-col"
          aria-busy={saving}
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <header className="flex items-start gap-3 border-b border-bento-hairline px-5 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-xs font-medium tracking-wide text-bento-subtle uppercase">
                Transaction details
              </p>
              <SheetTitle className="font-heading text-xl font-bold text-balance wrap-anywhere">
                {draft.payee || transaction.original_name || "Transaction"}
              </SheetTitle>
              <SheetDescription className="mt-1 text-sm text-bento-subtle tabular-nums">
                {draft.date ? formatShortDate(draft.date) : "Date needed"} ·{" "}
                {categoryName}
              </SheetDescription>
              {draft.amount.trim() !== "" && Number.isFinite(amount) && (
                <p className="mt-3 font-mono text-lg font-semibold text-bento-default tabular-nums">
                  {formatCurrency(Math.abs(amount), draft.currency, true)}
                  <span className="ml-2 text-xs font-normal text-bento-subtle">
                    {amount < 0 ? "Credit" : "Debit"}
                  </span>
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label="Close transaction details"
              onClick={requestClose}
              disabled={saving}
            >
              <X />
            </Button>
          </header>

          <div
            inert={saving}
            className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6"
          >
            {transaction.status === "delete_pending" && (
              <div className="flex gap-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p className="text-pretty">
                  Lunch Money needs you to resolve this deleted bank
                  transaction.
                </p>
              </div>
            )}
            {transaction.is_pending && (
              <div className="flex gap-3 rounded-xl bg-warning/10 p-3 text-sm text-warning-foreground dark:text-warning-foreground">
                <Clock3 className="mt-0.5 size-4 shrink-0" />
                <p className="text-pretty">
                  This transaction is pending. Its name or amount may still
                  change.
                </p>
              </div>
            )}
            {structurallyLocked && (
              <div className="flex gap-3 rounded-xl bg-bento-raised p-3 text-sm text-bento-subtle">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p className="text-pretty">
                  Split and grouped transactions are read-only here. Use their
                  dedicated Lunch Money workflow to change them.
                </p>
              </div>
            )}

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold">Review</h3>
                  <p className="text-xs text-bento-subtle">
                    Confirm this transaction is correct.
                  </p>
                </div>
                <Button
                  type="button"
                  variant={draft.status === "reviewed" ? "default" : "outline"}
                  className="h-10"
                  aria-pressed={draft.status === "reviewed"}
                  disabled={
                    transaction.is_pending ||
                    transaction.status === "delete_pending" ||
                    structurallyLocked
                  }
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      status:
                        current.status === "reviewed"
                          ? "unreviewed"
                          : "reviewed",
                    }))
                  }
                >
                  <Check data-icon="inline-start" />
                  {draft.status === "reviewed" ? "Reviewed" : "Mark reviewed"}
                </Button>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <Field label="Payee" className="sm:col-span-2">
                <Input
                  aria-label="Payee"
                  value={draft.payee}
                  disabled={structurallyLocked}
                  onChange={(event) => updateDraft("payee", event.target.value)}
                />
                {transaction.original_name &&
                  transaction.original_name !== transaction.payee && (
                    <p className="mt-1.5 px-1 text-xs wrap-anywhere text-bento-subtle">
                      Statement: {transaction.original_name}
                    </p>
                  )}
              </Field>
              <Field label="Date">
                <Input
                  type="date"
                  aria-label="Date"
                  value={draft.date}
                  disabled={structurallyLocked}
                  onChange={(event) => updateDraft("date", event.target.value)}
                />
              </Field>
              <Field label="Category">
                <CategoryPicker
                  categoryId={draft.categoryId}
                  categoryName={categoryName}
                  options={categoryOptions}
                  disabled={structurallyLocked}
                  appearance="field"
                  onChange={(categoryId) =>
                    updateDraft("categoryId", categoryId)
                  }
                />
              </Field>
              <Field label="Amount">
                <Input
                  inputMode="decimal"
                  aria-invalid={!amountValid}
                  aria-label="Amount"
                  value={draft.amount}
                  disabled={locked || structurallyLocked}
                  onChange={(event) =>
                    updateDraft("amount", event.target.value)
                  }
                />
                <p className="mt-1.5 px-1 text-xs wrap-anywhere text-bento-subtle">
                  {amountValid
                    ? "Negative amounts are credits."
                    : "Enter an amount with up to four decimal places."}
                </p>
              </Field>
              <Field label="Currency">
                <Input
                  maxLength={3}
                  aria-invalid={!currencyValid}
                  aria-label="Currency"
                  value={draft.currency}
                  disabled={locked || structurallyLocked}
                  className="uppercase"
                  onChange={(event) =>
                    updateDraft("currency", event.target.value)
                  }
                />
              </Field>
              {!currencyValid && (
                <p
                  role="status"
                  className="text-xs text-bento-negative sm:col-span-2"
                >
                  Use a three-letter currency code, such as USD or CAD.
                </p>
              )}
              <Field label="Account" className="sm:col-span-2">
                <Select
                  value={draft.account}
                  onValueChange={(value) =>
                    value && updateDraft("account", value)
                  }
                >
                  <SelectTrigger
                    aria-label="Account"
                    className="h-10 w-full rounded-xl"
                    disabled={locked || structurallyLocked}
                  >
                    <SelectValue>
                      {(value: string) =>
                        value === "cash"
                          ? "Cash transaction"
                          : accounts.find((account) => account.id === value)
                              ?.name
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash transaction</SelectItem>
                    {accounts
                      .filter(isTransactionAccountOption)
                      .map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {locked && !structurallyLocked && (
                  <p className="mt-1.5 px-1 text-xs wrap-anywhere text-bento-subtle">
                    Amount, currency, and account are locked by this synced
                    account.
                  </p>
                )}
              </Field>
              <Field label="Recurring item" className="sm:col-span-2">
                <Select
                  value={draft.recurringId}
                  disabled={structurallyLocked}
                  onValueChange={(value) =>
                    value && updateDraft("recurringId", value)
                  }
                >
                  <SelectTrigger
                    aria-label="Recurring item"
                    className="h-10 w-full rounded-xl"
                  >
                    <SelectValue>
                      {(value: string) =>
                        recurringValueName(recurringItems, value)
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not recurring</SelectItem>
                    {recurringItems
                      .filter((item) => item.status === "reviewed")
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {recurringName(item)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tags" className="sm:col-span-2">
                <TagPicker
                  tags={tags.filter((tag) => !tag.archived)}
                  value={draft.tagIds}
                  disabled={structurallyLocked}
                  onChange={(tagIds) => updateDraft("tagIds", tagIds)}
                />
              </Field>
              <Field label="Notes" className="sm:col-span-2">
                <Textarea
                  rows={4}
                  aria-label="Notes"
                  value={draft.notes}
                  disabled={structurallyLocked}
                  className="max-h-none resize-none overflow-y-hidden wrap-anywhere"
                  placeholder="Add context for your future self…"
                  onChange={(event) => updateDraft("notes", event.target.value)}
                />
              </Field>
            </section>

            <section className="rounded-2xl bg-bento-raised p-4 text-xs text-bento-subtle">
              <dl className="grid grid-cols-icon-content gap-x-4 gap-y-2">
                <dt>Source</dt>
                <dd className="min-w-0 text-right wrap-anywhere text-bento-default capitalize">
                  {transaction.source ?? "Unknown"}
                </dd>
                <dt>Updated</dt>
                <dd className="min-w-0 text-right wrap-anywhere text-bento-default tabular-nums">
                  {new Date(transaction.updated_at).toLocaleString()}
                </dd>
                <dt>Transaction ID</dt>
                <dd className="min-w-0 text-right font-mono wrap-anywhere text-bento-default">
                  {transaction.id}
                </dd>
              </dl>
            </section>
          </div>

          <footer className="border-t border-bento-hairline bg-card px-5 py-4 sm:px-6">
            {error && (
              <p role="alert" className="mb-3 text-sm text-bento-negative">
                {error}
              </p>
            )}
            {confirmDiscard ? (
              <div role="alert" className="space-y-3">
                <p className="text-sm">Discard your unsaved changes?</p>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmDiscard(false)}
                  >
                    Keep editing
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setOpen(false)}
                  >
                    Discard changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10"
                  onClick={requestClose}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-10"
                  disabled={!valid || !changed || saving || structurallyLocked}
                >
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            )}
          </footer>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("block min-w-0", className)}
    >
      <span className="mb-1.5 block px-1 text-xs font-medium">{label}</span>
      {children}
    </div>
  );
}
