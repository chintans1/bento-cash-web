"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Autocomplete } from "@base-ui/react/autocomplete";
import {
  AlertTriangle,
  Check,
  Circle,
  Clock3,
  ExternalLink,
  LockKeyhole,
  Repeat2,
  Split,
  Trash2,
  X,
} from "lucide-react";
import {
  getRecurringItems,
  getTransaction,
  getTransactionsForMonth,
  type RecurringItem,
  type Tag,
  type Transaction,
} from "@/lib/lunchmoney/client";
import { SUPPORTED_CURRENCIES } from "@/lib/lunchmoney/currencies";
import {
  detailDate,
  DetailFields,
  Metadata,
} from "@/components/accounts/account-detail-fields";
import { DatePicker } from "@/components/ui/date-picker";
import { fieldStyles } from "@/components/ui/field-styles";
import type { NormalizedAccount } from "@/lib/account-utils";
import {
  canEditTransactionCurrency,
  changedPatch,
  isReviewableTransaction,
  isStructurallyLockedTransaction,
  isTransactionAccountOption,
  transactionAccountKey,
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { amountForEditing } from "@/lib/lunchmoney/transaction-structure";
import {
  confirmedRecurringId,
  expectedRecurringDate,
  postedRecurringIds,
  recurringMatch,
} from "@/lib/lunchmoney/recurring-match";
import {
  parsePlaidMetadata,
  plaidCategorySuggestion,
  plaidTransactionContext,
} from "@/lib/lunchmoney/plaid-metadata";
import { PayeeSuggestionsPopup } from "./editable-text";

type Draft = {
  payee: string;
  date: string;
  amount: string;
  currency: Transaction["currency"];
  categoryId: number | null;
  account: string;
  recurringId: string;
  tagIds: number[];
  notes: string;
};

function makeDraft(transaction: Transaction): Draft {
  return {
    payee: transaction.payee ?? "",
    date: transaction.date,
    amount: amountForEditing(transaction.amount),
    currency: transaction.currency,
    categoryId: transaction.category_id,
    account: transactionAccountKey(transaction),
    recurringId: transaction.recurring_id?.toString() ?? "none",
    tagIds: transaction.tag_ids,
    notes: transaction.notes ?? "",
  };
}

const currencyNames = new Intl.DisplayNames("en-US", { type: "currency" });

const sourceLabels: Record<NonNullable<Transaction["source"]>, string> = {
  api: "Added via API",
  csv: "CSV import",
  manual: "Manual entry",
  merge: "Account merge",
  plaid: "Plaid sync",
  recurring: "Recurring item",
  rule: "Transaction rule",
  split: "Split transaction",
  user: "User entry",
};

function currencyLabel(code: string) {
  const upper = code.toUpperCase();
  const name = currencyNames.of(upper);
  return name && name !== upper ? `${upper} · ${name}` : upper;
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

function recurringAmount(item: RecurringItem) {
  const { amount, currency } = item.transaction_criteria;
  const value = Number(amount);
  if (!amount || !currency || !Number.isFinite(value)) return null;
  return `${value < 0 ? "+" : ""}${formatCurrency(Math.abs(value), currency, true)} ${currency.toUpperCase()}`;
}

export function TransactionEditor({
  transaction,
  monthTransactions,
  categoryOptions,
  accounts,
  tags,
  recurringItems,
  recurringItemsLoading,
  recurringItemsError,
  onRefreshRecurringItems,
  isDemo,
  payeeSuggestions,
  saving,
  error,
  onClose,
  onReview,
  onSave,
  onDelete,
  onSplit,
  onGroup,
}: {
  transaction: Transaction;
  monthTransactions: Transaction[];
  categoryOptions: CategoryOption[];
  accounts: NormalizedAccount[];
  tags: Tag[];
  recurringItems: RecurringItem[];
  recurringItemsLoading: boolean;
  recurringItemsError: string | null;
  onRefreshRecurringItems: () => Promise<void>;
  isDemo: boolean;
  payeeSuggestions: string[];
  saving: boolean;
  error?: string;
  onClose: () => void;
  onReview: (reviewed: boolean) => void;
  onSave: (patch: TransactionPatch) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onSplit: () => void;
  onGroup: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [draft, setDraft] = useState(() => makeDraft(transaction));
  const [openedRecurringList, setOpenedRecurringList] = useState(false);
  const [recurringScheduleVersion, setRecurringScheduleVersion] = useState(0);
  const [recurringSchedule, setRecurringSchedule] = useState<{
    month: string;
    dates: Map<number, string[]>;
  }>();
  const [otherMonthMatches, setOtherMonthMatches] = useState<{
    month: string;
    ids: Set<number>;
  }>();
  const recurringPageOpened = useRef(false);
  const [refreshingRecurringItems, setRefreshingRecurringItems] =
    useState(false);
  const [recurringRefreshError, setRecurringRefreshError] = useState<
    string | null
  >(null);
  const draftRecurringId =
    draft.recurringId === "none" ? null : Number(draft.recurringId);
  const recurringStatus = recurringMatch(draftRecurringId, recurringItems);
  const selectedRecurringId = confirmedRecurringId(
    draftRecurringId,
    recurringItems
  );
  const canReviewSuggestion = recurringStatus === "possible" && !isDemo;
  const approvedRecurringItems = recurringItems.filter(
    (item) => item.status === "reviewed"
  );
  const draftMonth = draft.date.slice(0, 7);
  const originalMonth = transaction.date.slice(0, 7);
  const { id: transactionId } = transaction;
  const matchedIds = useMemo(
    () =>
      draftMonth === originalMonth
        ? postedRecurringIds(monthTransactions, transactionId)
        : otherMonthMatches?.month === draftMonth
          ? otherMonthMatches.ids
          : new Set<number>(),
    [
      draftMonth,
      monthTransactions,
      originalMonth,
      otherMonthMatches,
      transactionId,
    ]
  );
  const orderedRecurringItems = approvedRecurringItems.sort(
    (a, b) => Number(matchedIds.has(a.id)) - Number(matchedIds.has(b.id))
  );
  const { metadata, metadataStatus } = usePlaidDetails(transaction);
  const plaid = plaidTransactionContext(metadata);

  useEffect(() => {
    if (!openedRecurringList) return;
    const [year, month] = draftMonth.split("-").map(Number);
    let active = true;
    void getRecurringItems({ year, month }).then(
      (items) => {
        if (!active) return;
        const dates = new Map<number, string[]>();
        for (const item of items) {
          if (item.matches?.expected_occurrence_dates)
            dates.set(item.id, item.matches.expected_occurrence_dates);
        }
        setRecurringSchedule({ month: draftMonth, dates });
      },
      () => {
        if (active) setRecurringSchedule(undefined);
      }
    );
    return () => {
      active = false;
    };
  }, [draftMonth, openedRecurringList, recurringScheduleVersion]);

  useEffect(() => {
    if (!openedRecurringList || draftMonth === originalMonth) return;
    const [year, month] = draftMonth.split("-").map(Number);
    let active = true;
    void getTransactionsForMonth(year, month).then(
      ({ transactions }) => {
        if (active)
          setOtherMonthMatches({
            month: draftMonth,
            ids: postedRecurringIds(transactions, transactionId),
          });
      },
      () => {
        if (active) setOtherMonthMatches(undefined);
      }
    );
    return () => {
      active = false;
    };
  }, [draftMonth, openedRecurringList, originalMonth, transactionId]);

  const refreshRecurringList = useCallback(async () => {
    setRefreshingRecurringItems(true);
    setRecurringRefreshError(null);
    try {
      await onRefreshRecurringItems();
      setRecurringScheduleVersion((version) => version + 1);
    } catch (reason) {
      setRecurringRefreshError(
        reason instanceof Error
          ? reason.message
          : "Couldn't refresh recurring items."
      );
    } finally {
      setRefreshingRecurringItems(false);
    }
  }, [onRefreshRecurringItems]);

  useEffect(() => {
    function onReturn() {
      if (
        !recurringPageOpened.current ||
        document.visibilityState !== "visible"
      )
        return;
      recurringPageOpened.current = false;
      void refreshRecurringList();
    }
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    return () => {
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [refreshRecurringList]);

  function updateDraft<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  const currentAccount = accounts.find(
    (account) => account.id === transactionAccountKey(transaction)
  );
  const locked = currentAccount?.allowTransactionModifications === false;
  const structurallyLocked = isStructurallyLockedTransaction(transaction);
  const groupParent = transaction.is_group_parent;
  const splitChild = transaction.split_parent_id != null;
  const canEditCurrency =
    !locked &&
    !draft.account.startsWith("plaid-") &&
    canEditTransactionCurrency(transaction);
  const reviewed = transaction.status === "reviewed";
  const canReview = isReviewableTransaction(transaction);
  const showStructureAction =
    splitChild ||
    transaction.is_split_parent ||
    groupParent ||
    (!transaction.is_pending &&
      transaction.status !== "delete_pending" &&
      transaction.recurring_id == null);

  const canDelete =
    !transaction.is_split_parent &&
    !splitChild &&
    !groupParent &&
    transaction.group_parent_id == null;

  const patch = useMemo(() => {
    const selectedAccount = accounts.find(
      (account) => account.id === draft.account
    );
    return changedPatch(transaction, {
      payee: draft.payee.trim(),
      date: draft.date,
      amount: draft.amount,
      ...(canEditCurrency && { currency: draft.currency }),
      category_id: draft.categoryId,
      ...(draft.account === transactionAccountKey(transaction)
        ? {}
        : transactionAccountPatch(selectedAccount)),
      recurring_id:
        draft.recurringId === "none" ? null : Number(draft.recurringId),
      tag_ids: draft.tagIds,
      notes: draft.notes.trim() || null,
    });
  }, [accounts, canEditCurrency, draft, transaction]);

  const amountValid = /^-?\d+(\.\d{1,4})?$/.test(draft.amount);
  const categoryValid =
    !splitChild || draft.recurringId !== "none" || draft.categoryId != null;
  const valid = draft.date !== "" && amountValid && categoryValid;
  const categoryName =
    categoryOptions.find((option) => option.id === (draft.categoryId ?? -1))
      ?.name ?? "Uncategorized";
  const plaidCategoryHint =
    !structurallyLocked && draft.categoryId == null
      ? plaidCategorySuggestion(plaid.category, categoryOptions)
      : null;
  const plaidCategoryLabel = (plaid.category.detail ?? plaid.category.primary)
    ?.toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
  const merchantContext = [
    plaid.merchantName?.toLowerCase() !== draft.payee.trim().toLowerCase()
      ? plaid.merchantName
      : null,
    plaid.channel,
    plaid.location,
  ].filter(Boolean);
  const changed = Object.keys(patch).length > 0;
  const amount = Number(draft.amount);

  async function save() {
    if (!valid || !changed || saving) return;
    if (await onSave(patch)) setOpen(false);
  }

  async function remove() {
    if (!canDelete || saving || deleting) return;
    setDeleting(true);
    try {
      if (await onDelete()) setOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  function requestClose() {
    if (saving || deleting) return;
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
          aria-busy={saving || deleting}
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <header className="border-b border-bento-hairline px-5 pt-3 pb-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="font-heading text-base font-semibold">
                Transaction details
              </SheetTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Close transaction details"
                onClick={requestClose}
                disabled={saving || deleting}
              >
                <X />
              </Button>
            </div>
            <div className="mt-2 flex min-w-0 items-center gap-3">
              {plaid.logo && <MerchantLogo key={plaid.logo} src={plaid.logo} />}
              <div className="min-w-0">
                <p className="font-heading text-xl font-bold wrap-anywhere">
                  {draft.payee || transaction.original_name || "Transaction"}
                </p>
                <SheetDescription className="mt-1 text-sm text-bento-subtle tabular-nums">
                  {detailDate(draft.date) ?? "Date needed"} ·{" "}
                  <span
                    className={
                      draft.categoryId == null
                        ? "font-medium text-bento-negative"
                        : undefined
                    }
                  >
                    {categoryName}
                  </span>
                </SheetDescription>
              </div>
            </div>
            <p className="mt-2 text-xs text-bento-subtle">
              Source:{" "}
              {(transaction.source && sourceLabels[transaction.source]) ??
                "Unknown"}
              {merchantContext.length > 0 &&
                ` · ${merchantContext.join(" · ")}`}
              {plaid.website && (
                <>
                  {" · "}
                  <a
                    href={plaid.website.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full items-center gap-1 rounded-sm underline underline-offset-2 hover:text-bento-default focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    aria-label={`${plaid.website.label} (opens in a new tab)`}
                  >
                    <span className="truncate">{plaid.website.label}</span>
                    <ExternalLink
                      aria-hidden="true"
                      className="size-3 shrink-0"
                    />
                  </a>
                </>
              )}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              {draft.amount.trim() !== "" && Number.isFinite(amount) && (
                <p className="font-mono text-lg font-semibold text-bento-default tabular-nums">
                  {formatCurrency(
                    Math.abs(amount),
                    canEditCurrency ? draft.currency : transaction.currency,
                    true
                  )}
                  <span className="ml-2 text-xs font-normal text-bento-subtle">
                    {amount < 0 ? "Credit" : "Debit"}
                  </span>
                </p>
              )}
              {recurringStatus && (
                <Badge
                  variant="secondary"
                  className={cn(
                    recurringStatus === "possible" &&
                      "bg-warning/10 text-warning-foreground",
                    canReviewSuggestion &&
                      "hover:underline [a]:hover:bg-warning/20"
                  )}
                  render={
                    canReviewSuggestion ? (
                      <a
                        href="https://my.lunchmoney.app/recurring/suggested"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Possible recurring. Review in Lunch Money (opens in a new tab)"
                        onClick={() => {
                          recurringPageOpened.current = true;
                        }}
                      />
                    ) : undefined
                  }
                >
                  <Repeat2 aria-hidden="true" />
                  {recurringStatus === "confirmed"
                    ? "Recurring"
                    : "Possible recurring"}
                  {canReviewSuggestion && <ExternalLink aria-hidden="true" />}
                </Badge>
              )}
            </div>
            {(canReview || showStructureAction) && (
              <div className="mt-2 -ml-2 flex flex-wrap items-center gap-1">
                {canReview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "text-xs",
                      reviewed ? "text-bento-positive" : "text-bento-subtle"
                    )}
                    aria-label={reviewed ? "Mark unreviewed" : undefined}
                    disabled={saving || deleting}
                    onClick={() => onReview(!reviewed)}
                  >
                    {reviewed ? (
                      <Check data-icon="inline-start" aria-hidden="true" />
                    ) : (
                      <Circle data-icon="inline-start" aria-hidden="true" />
                    )}
                    {reviewed ? "Reviewed" : "Mark reviewed"}
                  </Button>
                )}
                {showStructureAction && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-bento-subtle"
                    disabled={saving || deleting || changed}
                    onClick={groupParent ? onGroup : onSplit}
                  >
                    <Split data-icon="inline-start" aria-hidden="true" />
                    {groupParent
                      ? "View group"
                      : splitChild || transaction.is_split_parent
                        ? "Edit split"
                        : "Split transaction"}
                  </Button>
                )}
                {showStructureAction && changed && (
                  <span className="px-2 text-xs text-bento-subtle">
                    Save or discard changes first.
                  </span>
                )}
              </div>
            )}
          </header>

          <div
            inert={saving || deleting}
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
            {(structurallyLocked || splitChild) && (
              <p className="text-xs text-bento-subtle">
                {splitChild
                  ? structurallyLocked
                    ? "Use Edit split to change this part."
                    : "Use Edit split to change this part’s amount or account."
                  : transaction.is_split_parent
                    ? "Use Edit split to manage the parts."
                    : "Open the group to manage its transactions."}
              </p>
            )}

            <section className="grid gap-4 sm:grid-cols-2">
              <Field label="Payee" className="sm:col-span-2">
                {!structurallyLocked ? (
                  <Autocomplete.Root
                    items={payeeSuggestions}
                    value={draft.payee}
                    onValueChange={(value) => updateDraft("payee", value)}
                  >
                    <Autocomplete.Input render={<Input aria-label="Payee" />} />
                    {payeeSuggestions.length > 0 && <PayeeSuggestionsPopup />}
                  </Autocomplete.Root>
                ) : (
                  <Input
                    aria-label="Payee"
                    value={draft.payee}
                    disabled={structurallyLocked}
                    onChange={(event) =>
                      updateDraft("payee", event.target.value)
                    }
                  />
                )}
                {transaction.original_name &&
                  transaction.original_name !== transaction.payee && (
                    <p className="mt-1.5 px-1 text-xs wrap-anywhere text-bento-subtle">
                      Statement: {transaction.original_name}
                    </p>
                  )}
              </Field>
              <Field label="Date">
                <DatePicker
                  label="Date"
                  value={draft.date}
                  disabled={structurallyLocked}
                  onChange={(value) => updateDraft("date", value)}
                />
                {plaid.authorizedDate && (
                  <p className="mt-1.5 px-1 text-xs text-bento-subtle">
                    Authorized {detailDate(plaid.authorizedDate)}
                    {plaid.postedDate &&
                      plaid.postedDate !== plaid.authorizedDate &&
                      ` · Posted ${detailDate(plaid.postedDate)}`}
                  </p>
                )}
              </Field>
              <Field label="Category">
                <CategoryPicker
                  categoryId={draft.categoryId}
                  categoryName={categoryName}
                  options={
                    splitChild && draft.recurringId === "none"
                      ? categoryOptions.filter((option) => option.id !== -1)
                      : categoryOptions
                  }
                  disabled={structurallyLocked}
                  appearance="field"
                  onChange={(categoryId) =>
                    updateDraft("categoryId", categoryId)
                  }
                />
                {!structurallyLocked &&
                  draft.categoryId == null &&
                  plaidCategoryLabel && (
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 px-1 text-xs text-bento-subtle">
                      <span>Plaid suggests {plaidCategoryLabel}</span>
                      {plaidCategoryHint && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() =>
                            updateDraft("categoryId", plaidCategoryHint.id)
                          }
                        >
                          Use {plaidCategoryHint.name}
                        </Button>
                      )}
                    </div>
                  )}
                {!categoryValid && (
                  <p role="alert" className="mt-1 text-xs text-bento-negative">
                    Choose a category or recurring item for this split part.
                  </p>
                )}
              </Field>
              <Field label="Amount">
                <Input
                  inputMode="decimal"
                  aria-invalid={!amountValid}
                  aria-label="Amount"
                  value={draft.amount}
                  disabled={
                    locked || structurallyLocked || groupParent || splitChild
                  }
                  onChange={(event) =>
                    updateDraft("amount", event.target.value)
                  }
                />
                <p className="mt-1.5 px-1 text-xs wrap-anywhere text-bento-subtle">
                  {amountValid
                    ? "Negative amounts are credits."
                    : "Enter a valid amount."}
                </p>
              </Field>
              <Field label="Currency">
                {canEditCurrency ? (
                  <Select
                    value={draft.currency}
                    onValueChange={(value) =>
                      value && updateDraft("currency", value)
                    }
                  >
                    <SelectTrigger aria-label="Currency" className="w-full">
                      <SelectValue>
                        {(value: string) => currencyLabel(value)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {SUPPORTED_CURRENCIES.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currencyLabel(currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div
                    className={cn(
                      fieldStyles,
                      "flex min-w-0 items-center gap-2 border-bento-hairline bg-transparent"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {currencyLabel(transaction.currency)}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-bento-subtle">
                      <LockKeyhole className="size-3" aria-hidden="true" />
                      Read only
                    </span>
                  </div>
                )}
              </Field>
              <Field label="Account" className="sm:col-span-2">
                <Select
                  value={draft.account}
                  onValueChange={(value) =>
                    value && updateDraft("account", value)
                  }
                >
                  <SelectTrigger
                    aria-label="Account"
                    className="w-full"
                    disabled={
                      locked || structurallyLocked || groupParent || splitChild
                    }
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
                {groupParent ? (
                  <p className="mt-1.5 px-1 text-xs wrap-anywhere text-bento-subtle">
                    The group amount comes from its transactions. Its currency
                    and account cannot be changed here.
                  </p>
                ) : locked && !structurallyLocked ? (
                  <p className="mt-1.5 px-1 text-xs wrap-anywhere text-bento-subtle">
                    Amount, currency, and account are locked by this synced
                    account.
                  </p>
                ) : null}
              </Field>
              <Field label="Recurring item" className="sm:col-span-2">
                <Select
                  value={selectedRecurringId?.toString() ?? "none"}
                  onOpenChange={(open) => {
                    if (open) setOpenedRecurringList(true);
                  }}
                  disabled={structurallyLocked || groupParent}
                  onValueChange={(value) =>
                    value && updateDraft("recurringId", value)
                  }
                >
                  <SelectTrigger aria-label="Recurring item" className="w-full">
                    <SelectValue>
                      {(value: string) =>
                        value === "none" && recurringStatus === "possible"
                          ? "No accepted recurring item"
                          : recurringValueName(recurringItems, value)
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectItem value="none">Not recurring</SelectItem>
                    {orderedRecurringItems.map((item) => {
                      const matched = matchedIds.has(item.id);
                      const expected = matched
                        ? null
                        : expectedRecurringDate(
                            recurringSchedule?.month === draftMonth
                              ? recurringSchedule.dates.get(item.id)
                              : item.matches?.expected_occurrence_dates,
                            draft.date
                          );
                      return (
                        <SelectItem
                          key={item.id}
                          value={item.id.toString()}
                          label={recurringName(item)}
                          className="*:data-[slot=select-item-text]:min-w-0 *:data-[slot=select-item-text]:shrink"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate">
                                {recurringName(item)}
                              </span>
                              <span className="shrink-0 font-normal tabular-nums">
                                {recurringAmount(item)}
                              </span>
                            </div>
                            {(matched || expected) && (
                              <div className="text-xs font-normal text-bento-subtle">
                                {expected
                                  ? `Expected date: ${formatShortDate(expected)}`
                                  : "Matched this month"}
                              </div>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {recurringItemsLoading ? (
                  <p className="mt-2 px-1 text-xs text-bento-subtle">
                    Loading recurring items…
                  </p>
                ) : recurringItemsError || recurringRefreshError ? (
                  <p
                    role="alert"
                    className="mt-2 px-1 text-xs text-bento-negative"
                  >
                    Couldn’t load recurring items:{" "}
                    {recurringRefreshError ?? recurringItemsError}
                  </p>
                ) : approvedRecurringItems.length === 0 ? (
                  <p className="mt-2 px-1 text-xs text-bento-subtle">
                    No accepted recurring items are available. Create one or
                    accept a suggestion in Lunch Money, then refresh this list.
                  </p>
                ) : null}
                {(approvedRecurringItems.length === 0 ||
                  recurringItemsError ||
                  recurringRefreshError) &&
                  !recurringItemsLoading && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
                      {!isDemo && (
                        <a
                          href="https://my.lunchmoney.app/recurring"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                          })}
                          onClick={() => {
                            recurringPageOpened.current = true;
                          }}
                        >
                          Open recurring items in Lunch Money
                          <ExternalLink
                            aria-hidden="true"
                            className="size-3.5"
                          />
                        </a>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={refreshingRecurringItems}
                        onClick={() => void refreshRecurringList()}
                      >
                        {refreshingRecurringItems
                          ? "Refreshing…"
                          : "Refresh list"}
                      </Button>
                    </div>
                  )}
              </Field>
              <Field label="Tags" className="sm:col-span-2">
                <TagPicker
                  tags={tags}
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

            <TransactionSourceDetails
              transaction={transaction}
              metadata={metadata}
              metadataStatus={metadataStatus}
            />
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
            ) : confirmDelete ? (
              <div role="alert" className="space-y-3">
                <p className="text-sm">
                  Delete this transaction? This cannot be undone.
                  {changed && " Unsaved changes will be discarded."}
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmDelete(false)}
                    disabled={saving || deleting}
                  >
                    Keep transaction
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void remove()}
                    disabled={saving || deleting}
                  >
                    {deleting ? "Deleting…" : "Delete transaction"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between gap-2">
                {canDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 text-destructive hover:text-destructive"
                    onClick={() => setConfirmDelete(true)}
                    disabled={saving}
                  >
                    <Trash2 data-icon="inline-start" />
                    Delete
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
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
                    disabled={
                      !valid || !changed || saving || structurallyLocked
                    }
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </div>
            )}
          </footer>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function MerchantLogo({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // Plaid serves the 100×100 logo. The payee beside it provides the label.
    <img
      src={src}
      alt=""
      width={36}
      height={36}
      referrerPolicy="no-referrer"
      className="size-9 shrink-0 rounded-lg bg-white object-contain -outline-offset-1 outline-black/10 dark:outline-white/10"
      onError={() => setFailed(true)}
    />
  );
}

function usePlaidDetails(transaction: Transaction) {
  const isPlaid =
    transaction.source === "plaid" || transaction.plaid_account_id != null;
  const existingMetadata = transaction.plaid_metadata;
  const [result, setResult] = useState<{
    id: number;
    data: Transaction["plaid_metadata"];
    failed?: boolean;
  }>();

  useEffect(() => {
    if (!isPlaid || existingMetadata) return;
    let active = true;
    void getTransaction(transaction.id).then(
      (details) => {
        if (active)
          setResult({ id: transaction.id, data: details.plaid_metadata });
      },
      () => {
        if (active) setResult({ id: transaction.id, data: null, failed: true });
      }
    );
    return () => {
      active = false;
    };
  }, [existingMetadata, isPlaid, transaction.id]);

  const detail = result?.id === transaction.id ? result : undefined;
  return {
    metadata: parsePlaidMetadata(existingMetadata ?? detail?.data),
    metadataStatus: !isPlaid
      ? "hidden"
      : existingMetadata || (detail && !detail.failed)
        ? "loaded"
        : detail?.failed
          ? "failed"
          : "loading",
  } as const;
}

function TransactionSourceDetails({
  transaction,
  metadata,
  metadataStatus,
}: { transaction: Transaction } & ReturnType<typeof usePlaidDetails>) {
  return (
    <section className="space-y-3 rounded-2xl bg-bento-raised p-4 text-xs">
      <DetailFields
        fields={[
          ["Created", detailDate(transaction.created_at, true)],
          ["Last updated", detailDate(transaction.updated_at, true)],
          ["Transaction ID", transaction.id],
        ]}
      />
      {metadataStatus === "loading" && (
        <p role="status" className="text-bento-subtle">
          Loading Plaid metadata…
        </p>
      )}
      {metadataStatus === "loaded" &&
        (metadata && Object.keys(metadata).length > 0 ? (
          <Metadata label="Plaid metadata" data={metadata} />
        ) : (
          <p className="text-bento-subtle">No Plaid metadata available.</p>
        ))}
      {metadataStatus === "failed" && (
        <p className="text-bento-subtle">Couldn’t load Plaid metadata.</p>
      )}
    </section>
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
