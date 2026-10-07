"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type {
  Transaction,
  RecurringItem,
  Tag,
  SplitParts,
  GroupInput,
} from "@/lib/lunchmoney/client";
import {
  getTransaction,
  groupTransactions,
  replaceSplit,
  splitTransaction,
  updateTransaction,
  updateSplitChildRecurring,
  ungroupTransaction,
  unsplitTransaction,
} from "@/lib/lunchmoney/client";
import {
  amountForEditing,
  amountUnits,
  applySplitRecurringLinks,
  defaultSplitAmounts,
  equalSplitAmounts,
  groupError,
  remainingSplitAmount,
  reviewSplitChildren,
  recurringItemName,
  splitCategoryError,
  splitError,
  suggestRecurringItems,
} from "@/lib/lunchmoney/transaction-structure";
import { formatCurrency, formatShortDate } from "@/lib/format";
import {
  confirmedRecurringId,
  recurringMatch,
} from "@/lib/lunchmoney/recurring-match";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { CategoryPicker, type CategoryOption } from "./category-picker";
import { TagPicker } from "./tag-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SplitDraft = {
  key: string;
  amount: string;
  payee: string;
  date: string;
  category_id: number | null;
  tag_ids: number[];
  notes: string;
  recurringId: number | null;
};

function childDraft(
  parent: Transaction,
  amount: string,
  key: string
): SplitDraft {
  return {
    key,
    amount,
    payee: parent.payee,
    date: parent.date,
    category_id: parent.category_id,
    tag_ids: [...parent.tag_ids],
    notes: parent.notes ?? "",
    recurringId: null,
  };
}

function initialSplit(parent: Transaction): SplitDraft[] {
  if (parent.is_split_parent && parent.children?.length) {
    return parent.children.map((child) => ({
      key: String(child.id),
      amount: amountForEditing(child.amount),
      payee: child.payee,
      date: child.date,
      category_id: child.category_id,
      tag_ids: [...child.tag_ids],
      notes: child.notes ?? "",
      recurringId: child.recurring_id,
    }));
  }
  const [first, second] = defaultSplitAmounts(parent.amount) ?? ["", ""];
  return [
    childDraft(parent, first, "new-1"),
    childDraft(parent, second, "new-2"),
  ];
}

function splitParts(drafts: SplitDraft[]): SplitParts {
  return drafts.map((draft) => ({
    amount: draft.amount,
    payee: draft.payee.trim(),
    date: draft.date,
    category_id: draft.category_id,
    tag_ids: draft.tag_ids,
    notes: draft.notes.trim() || null,
  }));
}

export function SplitEditor({
  transaction,
  categories,
  tags,
  recurringItems,
  isDemo,
  onClose,
  onCommitted,
}: {
  transaction: Transaction;
  categories: CategoryOption[];
  tags: Tag[];
  recurringItems: RecurringItem[];
  isDemo: boolean;
  onClose: () => void;
  onCommitted: () => Promise<void>;
}) {
  const parentId = transaction.split_parent_id ?? transaction.id;
  const [parent, setParent] = useState<Transaction | null>(null);
  const [drafts, setDrafts] = useState<SplitDraft[]>([]);
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [original, setOriginal] = useState("");
  const [originalLinks, setOriginalLinks] = useState<(number | null)[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmUnsplit, setConfirmUnsplit] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [open, setOpen] = useState(true);
  const nextDraftKey = useRef(3);

  useEffect(() => {
    let cancelled = false;
    getTransaction(parentId)
      .then((result) => {
        if (cancelled) return;
        if (transaction.split_parent_id && !result.is_split_parent) {
          setError("This split has changed. Close and reopen it.");
          return;
        }
        if (result.is_split_parent && !result.children?.length) {
          setError(
            "The split details could not be loaded. Close and reopen it."
          );
          return;
        }
        const initial = initialSplit(result);
        setParent(result);
        setDrafts(initial);
        setSplitMode(result.is_split_parent ? "custom" : "equal");
        setOriginal(JSON.stringify(splitParts(initial)));
        setOriginalLinks(initial.map((draft) => draft.recurringId));
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load transaction"
          );
      });
    return () => {
      cancelled = true;
    };
  }, [parentId, transaction.split_parent_id]);

  const parts = useMemo(() => splitParts(drafts), [drafts]);
  const recurringIds = drafts.map((draft) => draft.recurringId);
  const validation = parent
    ? (splitError(parent, parts) ?? splitCategoryError(parts, recurringIds))
    : null;
  const allocated = drafts.reduce(
    (sum, draft) => sum + (amountUnits(draft.amount) ?? 0),
    0
  );
  const remaining =
    (parent ? (amountUnits(parent.amount) ?? 0) : 0) - allocated;
  const approvedRecurring = useMemo(
    () =>
      recurringItems
        .filter((item) => item.status === "reviewed")
        .sort((a, b) =>
          recurringItemName(a).localeCompare(recurringItemName(b))
        ),
    [recurringItems]
  );
  const structureChanged = JSON.stringify(parts) !== original;
  const linksChanged = drafts.some(
    (draft, index) => draft.recurringId !== originalLinks[index]
  );
  const reviewPending = Boolean(
    parent?.is_split_parent &&
    parent.children?.some((child) => child.status !== "reviewed")
  );
  const changed = structureChanged || linksChanged || reviewPending;

  function change(index: number, patch: Partial<SplitDraft>) {
    setDrafts((current) =>
      current.map((draft, i) => (i === index ? { ...draft, ...patch } : draft))
    );
  }

  function distributeEqually(drafts: SplitDraft[]): SplitDraft[] {
    if (!parent) return drafts;
    const amounts = equalSplitAmounts(parent.amount, drafts.length);
    return amounts
      ? drafts.map((draft, index) => ({ ...draft, amount: amounts[index] }))
      : drafts;
  }

  function chooseMode(next: "equal" | "custom") {
    setSplitMode(next);
    if (next === "equal") setDrafts(distributeEqually);
  }

  function fillRemainder(index: number) {
    if (!parent) return;
    const amount = remainingSplitAmount(
      parent.amount,
      drafts.filter((_, i) => i !== index).map((draft) => draft.amount)
    );
    if (amount !== null) change(index, { amount });
  }

  function recurringSuggestions(draft: SplitDraft): RecurringItem[] {
    if (!parent) return [];
    return suggestRecurringItems(approvedRecurring, {
      payee: draft.payee,
      amount: draft.amount,
      date: draft.date,
      currency: parent.currency,
      manual_account_id: parent.manual_account_id,
      plaid_account_id: parent.plaid_account_id,
    });
  }

  function requestClose() {
    if (busy) return;
    if (changed) setConfirmDiscard(true);
    else setOpen(false);
  }

  async function save() {
    if (!parent || validation || busy || (parent.is_split_parent && !changed))
      return;
    setBusy(true);
    setError(null);
    let result: Transaction;
    try {
      result = !parent.is_split_parent
        ? await splitTransaction(parent.id, parts, recurringIds)
        : structureChanged
          ? await replaceSplit(parent.id, parts, recurringIds)
          : parent;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save split");
      // Replacement may have restored the old split with new child IDs.
      await onCommitted().catch(() => undefined);
      setBusy(false);
      return;
    }

    if (!result.children || result.children.length !== drafts.length) {
      setParent(result);
      setError(
        "The split was saved, but Lunch Money did not return its parts. Close and reopen it before linking recurring items."
      );
      await onCommitted().catch(() => undefined);
      setBusy(false);
      return;
    }

    const nextDrafts = drafts.map((draft, index) => ({
      ...draft,
      key: String(result.children![index].id),
    }));
    const { actual, failures: linkFailures } = await applySplitRecurringLinks(
      result.children,
      recurringIds,
      updateSplitChildRecurring
    );
    const { statuses, failures: reviewFailures } = await reviewSplitChildren(
      result.children,
      (id) => updateTransaction(id, { status: "reviewed" })
    );
    setParent({
      ...result,
      children: result.children.map((child, index) => ({
        ...child,
        recurring_id: actual[index],
        status: statuses[index],
      })),
    });
    setDrafts(nextDrafts);
    setOriginal(JSON.stringify(splitParts(nextDrafts)));
    setOriginalLinks(actual);
    setSplitMode("custom");
    await onCommitted().catch(() => undefined);
    if (linkFailures.length || reviewFailures.length) {
      setError(
        `The split was saved, but ${[
          linkFailures.length &&
            `${linkFailures.length} recurring ${linkFailures.length === 1 ? "link" : "links"}`,
          reviewFailures.length &&
            `${reviewFailures.length} review ${reviewFailures.length === 1 ? "update" : "updates"}`,
        ]
          .filter(Boolean)
          .join(" and ")} could not be confirmed. You can retry here.`
      );
    } else {
      setOpen(false);
    }
    setBusy(false);
  }

  async function unsplit() {
    if (!parent || busy) return;
    setBusy(true);
    setError(null);
    try {
      await unsplitTransaction(parent.id);
      await onCommitted().catch(() => undefined);
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not remove split"
      );
    } finally {
      setBusy(false);
    }
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
        <div className="flex h-full flex-col" aria-busy={busy}>
          <header className="flex items-start gap-3 border-b border-bento-hairline px-5 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-xs font-medium tracking-wide text-bento-subtle uppercase">
                Transaction split
              </p>
              <SheetTitle className="font-heading text-xl font-bold">
                {parent?.payee ?? "Loading…"}
              </SheetTitle>
              <SheetDescription className="mt-1 text-sm text-bento-subtle">
                {parent
                  ? `${formatShortDate(parent.date)} · ${formatCurrency(Number(parent.amount), parent.currency, true)}`
                  : "Loading transaction"}
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Close split editor"
              disabled={busy}
              onClick={requestClose}
            >
              <X />
            </Button>
          </header>
          <div
            inert={busy}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6"
          >
            {parent?.is_split_parent && structureChanged && (
              <p className="rounded-xl bg-bento-raised p-3 text-xs text-bento-subtle">
                Saving changes replaces the split. Lunch Money will assign new
                IDs to all split transactions.
              </p>
            )}
            {parent && (
              <section className="rounded-2xl border border-bento-hairline p-4">
                <h3 className="text-sm font-semibold">
                  How should this be split?
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    variant={splitMode === "equal" ? "default" : "outline"}
                    aria-pressed={splitMode === "equal"}
                    onClick={() => chooseMode("equal")}
                  >
                    Split equally
                  </Button>
                  <Button
                    variant={splitMode === "custom" ? "default" : "outline"}
                    aria-pressed={splitMode === "custom"}
                    onClick={() => chooseMode("custom")}
                  >
                    Custom amounts
                  </Button>
                </div>
                <p className="mt-2 text-xs text-bento-subtle">
                  {splitMode === "equal"
                    ? "Amounts stay equal as you add or remove parts."
                    : "Enter each amount, or fill a part with what remains."}
                </p>
              </section>
            )}
            {parent &&
              drafts.map((draft, index) => (
                <section
                  key={draft.key}
                  className="space-y-3 rounded-2xl border border-bento-hairline p-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Split {index + 1}</h3>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove split ${index + 1}`}
                      disabled={drafts.length <= 2 || busy}
                      onClick={() =>
                        setDrafts((current) => {
                          const next = current.filter((_, i) => i !== index);
                          return splitMode === "equal"
                            ? distributeEqually(next)
                            : next;
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-xs font-medium sm:col-span-2">
                      Payee
                      <Input
                        aria-label={`Split ${index + 1} payee`}
                        value={draft.payee}
                        onChange={(e) =>
                          change(index, { payee: e.target.value })
                        }
                      />
                    </label>
                    <div className="space-y-1 text-xs font-medium">
                      <div className="flex items-center justify-between gap-2">
                        <span>Amount</span>
                        {splitMode === "custom" && (
                          <button
                            type="button"
                            className="text-bento-brand hover:underline"
                            onClick={() => fillRemainder(index)}
                          >
                            Use remaining
                          </button>
                        )}
                      </div>
                      <Input
                        aria-label={`Split ${index + 1} amount`}
                        inputMode="decimal"
                        value={draft.amount}
                        disabled={splitMode === "equal"}
                        onChange={(e) =>
                          change(index, { amount: e.target.value })
                        }
                      />
                    </div>
                    <label className="space-y-1 text-xs font-medium">
                      Date
                      <Input
                        aria-label={`Split ${index + 1} date`}
                        type="date"
                        value={draft.date}
                        onChange={(e) =>
                          change(index, { date: e.target.value })
                        }
                      />
                    </label>
                    <div className="space-y-1 text-xs font-medium sm:col-span-2">
                      Category
                      <CategoryPicker
                        categoryId={draft.category_id}
                        categoryName={
                          categories.find(
                            (item) => item.id === draft.category_id
                          )?.name ?? "Uncategorized"
                        }
                        options={categories}
                        appearance="field"
                        onChange={(category_id) =>
                          change(index, { category_id })
                        }
                      />
                    </div>
                    <div className="space-y-2 text-xs font-medium sm:col-span-2">
                      <span>Recurring item</span>
                      {recurringSuggestions(draft).length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="mr-1 text-bento-subtle">
                            Suggested
                          </span>
                          {recurringSuggestions(draft).map((item) => (
                            <Button
                              key={item.id}
                              variant={
                                draft.recurringId === item.id
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              className="max-w-full"
                              aria-pressed={draft.recurringId === item.id}
                              onClick={() =>
                                change(index, { recurringId: item.id })
                              }
                            >
                              <span className="truncate">
                                {recurringItemName(item)}
                              </span>
                              <span className="font-mono tabular-nums">
                                {formatCurrency(
                                  Number(item.transaction_criteria.amount),
                                  item.transaction_criteria.currency,
                                  true
                                )}
                              </span>
                            </Button>
                          ))}
                        </div>
                      )}
                      <Select
                        value={
                          confirmedRecurringId(
                            draft.recurringId,
                            recurringItems
                          )?.toString() ?? "none"
                        }
                        onValueChange={(value) =>
                          value &&
                          change(index, {
                            recurringId:
                              value === "none" ? null : Number(value),
                          })
                        }
                      >
                        <SelectTrigger
                          aria-label={`Split ${index + 1} recurring item`}
                          className="h-10 w-full rounded-xl"
                        >
                          <SelectValue>
                            {(value: string) => {
                              if (value === "none") return "Not recurring";
                              const item = recurringItems.find(
                                (candidate) => candidate.id === Number(value)
                              );
                              return item
                                ? recurringItemName(item)
                                : `Recurring item #${value}`;
                            }}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not recurring</SelectItem>
                          {approvedRecurring.map((item) => (
                            <SelectItem
                              key={item.id}
                              value={item.id.toString()}
                            >
                              {recurringItemName(item)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {recurringMatch(draft.recurringId, recurringItems) ===
                      "possible" ? (
                        <p className="font-normal text-warning-foreground">
                          This recurring suggestion is awaiting review.
                          {!isDemo && (
                            <>
                              {" "}
                              You can{" "}
                              <a
                                href="https://my.lunchmoney.app/recurring/suggested"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline underline-offset-2"
                              >
                                accept or dismiss it in Lunch Money
                              </a>
                              .
                            </>
                          )}
                        </p>
                      ) : (
                        <p className="font-normal text-bento-subtle">
                          Choose an existing recurring item to link when you
                          save.
                        </p>
                      )}
                    </div>
                    <div className="space-y-1 text-xs font-medium sm:col-span-2">
                      Tags
                      <TagPicker
                        tags={tags.filter((tag) => !tag.archived)}
                        value={draft.tag_ids}
                        onChange={(tag_ids) => change(index, { tag_ids })}
                      />
                    </div>
                    <label className="space-y-1 text-xs font-medium sm:col-span-2">
                      Notes
                      <Textarea
                        aria-label={`Split ${index + 1} notes`}
                        rows={2}
                        value={draft.notes}
                        onChange={(e) =>
                          change(index, { notes: e.target.value })
                        }
                      />
                    </label>
                  </div>
                </section>
              ))}
            {parent && (
              <Button
                variant="outline"
                className="h-10 w-full"
                onClick={() =>
                  setDrafts((current) => {
                    const next = [
                      ...current,
                      childDraft(parent, "", `new-${nextDraftKey.current++}`),
                    ];
                    return splitMode === "equal"
                      ? distributeEqually(next)
                      : next;
                  })
                }
              >
                <Plus className="size-4" /> Add split
              </Button>
            )}
            {parent && (
              <p className="text-right font-mono text-xs text-bento-subtle tabular-nums">
                Remaining:{" "}
                {formatCurrency(remaining / 10000, parent.currency, true)}
              </p>
            )}
            {parent && (
              <p className="text-xs text-bento-subtle">
                Each part needs a category or recurring item. Saved parts are
                marked reviewed.
              </p>
            )}
          </div>
          <footer className="border-t border-bento-hairline bg-card px-5 py-4 sm:px-6">
            {(error || (changed && validation)) && (
              <p role="alert" className="mb-3 text-sm text-bento-negative">
                {error ?? validation}
              </p>
            )}
            {confirmDiscard ? (
              <div className="space-y-2">
                <p className="text-sm">
                  Close without applying the remaining changes?
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmDiscard(false)}
                  >
                    Keep editing
                  </Button>
                  <Button variant="destructive" onClick={() => setOpen(false)}>
                    Discard changes
                  </Button>
                </div>
              </div>
            ) : confirmUnsplit ? (
              <div className="space-y-2">
                <p className="text-sm">
                  Remove this split and restore the original transaction?
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmUnsplit(false)}
                  >
                    Keep split
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() => void unsplit()}
                  >
                    Remove split
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between gap-2">
                {parent?.is_split_parent ? (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setConfirmUnsplit(true)}
                  >
                    Remove split
                  </Button>
                ) : (
                  <span />
                )}
                <Button
                  disabled={
                    !parent ||
                    !!validation ||
                    busy ||
                    (parent.is_split_parent && !changed)
                  }
                  onClick={() => void save()}
                >
                  {busy
                    ? "Saving…"
                    : parent?.is_split_parent && !structureChanged
                      ? linksChanged
                        ? "Save recurring links"
                        : "Mark parts reviewed"
                      : drafts.some((draft) => draft.recurringId != null)
                        ? "Save split and links"
                        : parent?.is_split_parent
                          ? "Save split"
                          : "Split transaction"}
                </Button>
              </div>
            )}
          </footer>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function GroupEditor({
  transactions,
  groupId,
  categories,
  onClose,
  onCommitted,
}: {
  transactions?: Transaction[];
  groupId?: number;
  categories: CategoryOption[];
  onClose: () => void;
  onCommitted: () => Promise<void>;
}) {
  const first = transactions?.[0];
  const [group, setGroup] = useState<Transaction | null>(null);
  const [payee, setPayee] = useState(first?.payee ?? "");
  const [date, setDate] = useState(first?.date ?? "");
  const [categoryId, setCategoryId] = useState<number | null>(() =>
    transactions?.every((tx) => tx.category_id === first?.category_id)
      ? (first?.category_id ?? null)
      : null
  );
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmUngroup, setConfirmUngroup] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (groupId == null) return;
    let cancelled = false;
    getTransaction(groupId)
      .then((result) => {
        if (cancelled) return;
        if (!result.is_group_parent || !result.children) {
          setError(
            "The group details could not be loaded. Close and reopen it."
          );
          return;
        }
        setGroup(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setError(
            cause instanceof Error ? cause.message : "Could not load group"
          );
      });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const input: GroupInput = {
    ids: transactions?.map((tx) => tx.id) ?? [],
    payee: payee.trim(),
    date,
    category_id: categoryId,
    notes: notes.trim() || null,
    status: transactions?.every((tx) => tx.status === "reviewed")
      ? "reviewed"
      : "unreviewed",
  };
  const validation = groupError(input);
  const children = group?.children ?? transactions ?? [];
  const changed =
    !groupId &&
    (payee !== (first?.payee ?? "") ||
      date !== (first?.date ?? "") ||
      categoryId !==
        (transactions?.every((tx) => tx.category_id === first?.category_id)
          ? (first?.category_id ?? null)
          : null) ||
      notes !== "");

  function requestClose() {
    if (busy) return;
    if (changed) setConfirmDiscard(true);
    else setOpen(false);
  }

  async function save() {
    if (validation || busy) return;
    setBusy(true);
    setError(null);
    try {
      await groupTransactions(input);
      await onCommitted().catch(() => undefined);
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not group transactions"
      );
    } finally {
      setBusy(false);
    }
  }

  async function ungroup() {
    if (groupId == null || busy) return;
    setBusy(true);
    setError(null);
    try {
      await ungroupTransaction(groupId);
      await onCommitted().catch(() => undefined);
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not ungroup transactions"
      );
    } finally {
      setBusy(false);
    }
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
        <div className="flex h-full flex-col" aria-busy={busy}>
          <header className="flex items-start gap-3 border-b border-bento-hairline px-5 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-xs font-medium tracking-wide text-bento-subtle uppercase">
                Transaction group
              </p>
              <SheetTitle className="font-heading text-xl font-bold">
                {groupId ? (group?.payee ?? "Loading…") : "Group transactions"}
              </SheetTitle>
              <SheetDescription className="mt-1 text-sm text-bento-subtle">
                {children.length} transactions
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Close group editor"
              disabled={busy}
              onClick={requestClose}
            >
              <X />
            </Button>
          </header>
          <div
            inert={busy}
            className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6"
          >
            {!groupId && (
              <div className="space-y-4">
                <label className="block space-y-1 text-xs font-medium">
                  Group payee
                  <Input
                    aria-label="Group payee"
                    value={payee}
                    onChange={(e) => setPayee(e.target.value)}
                  />
                </label>
                <label className="block space-y-1 text-xs font-medium">
                  Group date
                  <Input
                    aria-label="Group date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
                <div className="space-y-1 text-xs font-medium">
                  Category
                  <CategoryPicker
                    categoryId={categoryId}
                    categoryName={
                      categories.find((item) => item.id === categoryId)?.name ??
                      "Uncategorized"
                    }
                    options={categories}
                    appearance="field"
                    onChange={setCategoryId}
                  />
                </div>
                <label className="block space-y-1 text-xs font-medium">
                  Notes
                  <Textarea
                    aria-label="Group notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
              </div>
            )}
            <section>
              <h3 className="mb-2 text-sm font-semibold">
                Transactions in this group
              </h3>
              <div className="divide-y divide-bento-hairline rounded-2xl border border-bento-hairline">
                {children.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{tx.payee}</p>
                      <p className="text-xs text-bento-subtle">
                        {formatShortDate(tx.date)}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs tabular-nums">
                      {formatCurrency(Number(tx.amount), tx.currency, true)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            {groupId && (
              <p className="text-xs text-bento-subtle">
                Ungrouping restores the individual transactions.
              </p>
            )}
          </div>
          <footer className="border-t border-bento-hairline bg-card px-5 py-4 sm:px-6">
            {error && (
              <p role="alert" className="mb-3 text-sm text-bento-negative">
                {error}
              </p>
            )}
            {confirmDiscard ? (
              <div className="space-y-2">
                <p className="text-sm">Discard this group draft?</p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmDiscard(false)}
                  >
                    Keep editing
                  </Button>
                  <Button variant="destructive" onClick={() => setOpen(false)}>
                    Discard draft
                  </Button>
                </div>
              </div>
            ) : confirmUngroup ? (
              <div className="space-y-2">
                <p className="text-sm">Ungroup these transactions?</p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmUngroup(false)}
                  >
                    Keep group
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() => void ungroup()}
                  >
                    Ungroup
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                {groupId ? (
                  <Button
                    variant="outline"
                    disabled={!group || busy}
                    onClick={() => setConfirmUngroup(true)}
                  >
                    Ungroup
                  </Button>
                ) : (
                  <Button
                    disabled={!!validation || busy}
                    onClick={() => void save()}
                  >
                    {busy
                      ? "Grouping…"
                      : `Group ${transactions?.length ?? 0} transactions`}
                  </Button>
                )}
              </div>
            )}
          </footer>
        </div>
      </SheetContent>
    </Sheet>
  );
}
