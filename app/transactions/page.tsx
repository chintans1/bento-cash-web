"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  buildCategoryOptions,
  CategoryFilterPicker,
} from "@/components/transactions/category-picker";
import {
  TransactionRow,
  TRANSACTION_GRID_COLUMNS,
} from "@/components/transactions/transaction-row";
import { BulkEditDialog } from "@/components/transactions/bulk-edit-dialog";
import { TransactionEditor } from "@/components/transactions/transaction-editor";
import { MonthSummary } from "@/components/transactions/month-summary";
import {
  GroupEditor,
  SplitEditor,
} from "@/components/transactions/transaction-structure-editor";
import { usePayeeSuggestions } from "@/hooks/use-payee-suggestions";
import { formatCurrency } from "@/lib/format";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useAppData } from "@/hooks/use-app-data";
import { useMonthTransactions } from "@/hooks/use-month-transactions";
import { filterSpendTransactions } from "@/lib/lunchmoney/analytics";
import { UNCATEGORIZED, UNCATEGORIZED_ID } from "@/lib/lunchmoney/categories";
import { ConnectionPrompt } from "@/components/connection-prompt";
import { useMonthNavigation } from "@/hooks/use-month-navigation";
import { isCurrentOrFutureMonth } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { PageTitle } from "@/components/ui/page-title";
import {
  PageSidebar,
  PageSidebarHeading,
  PageSidebarLayout,
} from "@/components/ui/page-sidebar-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownUp, Check, Minus } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { MonthSelector } from "@/components/dashboard/month-selector";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import {
  comparePendingFirst,
  inlineCategoryPatch,
  isReviewableTransaction,
  matchesReviewFilter,
  reviewCounts,
  type ReviewFilter,
} from "@/lib/lunchmoney/transaction-state";
import { cn } from "@/lib/utils";
import { canGroupTransaction } from "@/lib/lunchmoney/transaction-structure";
import type { Transaction } from "@/lib/lunchmoney/client";
import { recurringMatch } from "@/lib/lunchmoney/recurring-match";

type SortKey = "date" | "amount" | "payee";
type SortDir = "asc" | "desc";

const NO_SELECTION = new Set<number>();
const TRANSACTIONS_PER_PAGE = 60;

/**
 * Arrow next to the active sort column. Declared at module scope rather than
 * inside the page so React doesn't treat it as a new component type on every
 * render.
 */
function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return null;
  return (
    <span className="ml-0.5 text-(length:--text-micro)">
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

function parseCategoryFilter(value: string | null): number | null {
  if (value === null) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function TransactionListLoading() {
  return (
    <div role="status" className="flex flex-col gap-2">
      <p className="mb-1 text-sm text-bento-subtle">Loading transactions…</p>
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="h-9 rounded-lg" />
      ))}
    </div>
  );
}

function TransactionsPage() {
  const { dataScopeKey, hasDataSource, isDemo } = useAuth();
  const {
    primaryCurrency,
    categoryMap,
    catGroups,
    accounts,
    tags,
    recurringItems,
    recurringItemsLoading,
    recurringItemsError,
    refreshRecurringItems,
    loading: appLoading,
    error: appError,
  } = useAppData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    year: selectedYear,
    month: selectedMonth,
    onPrev,
    onNext,
    onToday,
    pending,
  } = useMonthNavigation();
  const {
    transactions,
    loading: monthLoading,
    refreshing,
    error: monthError,
    savingIds,
    errors,
    update,
    remove,
    editMany,
    refresh,
  } = useMonthTransactions(selectedYear, selectedMonth, dataScopeKey);

  // Categories come from the app-level fetch, so rows wait on them too — a row
  // rendered before they land would read "Uncategorized".
  const loading = monthLoading || appLoading || pending;
  const error = monthError || appError;

  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  /** Row control to focus after an edit or after showing more transactions. */
  const pendingFocusRef = useRef<{
    id: number | undefined;
    target: "category" | "review" | "details";
  } | null>(null);
  const categoryParam = searchParams.get("category");
  const filterCatId = parseCategoryFilter(categoryParam);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const monthKey = `${selectedYear}-${selectedMonth}`;
  const listScope = JSON.stringify([
    monthKey,
    query,
    filterCatId,
    reviewFilter,
    sortKey,
    sortDir,
  ]);
  const [listPage, setListPage] = useState({
    scope: listScope,
    limit: TRANSACTIONS_PER_PAGE,
  });
  const visibleLimit =
    listPage.scope === listScope ? listPage.limit : TRANSACTIONS_PER_PAGE;
  const [selection, setSelection] = useState<{
    month: string;
    ids: Set<number>;
  }>({ month: monthKey, ids: new Set() });
  const selectedIds =
    selection.month === monthKey ? selection.ids : NO_SELECTION;
  const [bulkEditMonth, setBulkEditMonth] = useState<string>();
  const [editing, setEditing] = useState<{
    month: string;
    id: number;
  } | null>(null);
  const [structure, setStructure] = useState<
    | { type: "split"; transaction: Transaction }
    | { type: "group"; id: number }
    | { type: "group-create"; transactions: Transaction[] }
    | null
  >(null);

  const accountNames = useMemo(
    () =>
      new Map(
        accounts.map((account) => [
          `${account.source}-${account.rawId}`,
          account.name,
        ])
      ),
    [accounts]
  );
  const tagNames = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag.name])),
    [tags]
  );

  // Page-level shortcuts. Ignored while typing so they never eat input.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")
      ) {
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "[") {
        onPrev();
      } else if (
        event.key === "]" &&
        !isCurrentOrFutureMonth(selectedYear, selectedMonth)
      ) {
        onNext();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onPrev, onNext, selectedYear, selectedMonth]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const result = transactions.filter((tx) => {
      if (
        q &&
        !tx.payee?.toLowerCase().includes(q) &&
        !tx.original_name?.toLowerCase().includes(q) &&
        !tx.notes?.toLowerCase().includes(q) &&
        !categoryMap
          .get(tx.category_id ?? -1)
          ?.name.toLowerCase()
          .includes(q) &&
        !accountNames
          .get(
            tx.manual_account_id != null
              ? `manual-${tx.manual_account_id}`
              : tx.plaid_account_id != null
                ? `plaid-${tx.plaid_account_id}`
                : "cash"
          )
          ?.toLowerCase()
          .includes(q) &&
        !tx.tag_ids.some((id) => tagNames.get(id)?.toLowerCase().includes(q)) &&
        !tx.amount.includes(q)
      ) {
        return false;
      }
      if (!matchesReviewFilter(tx, reviewFilter)) return false;
      if (filterCatId === null) return true;
      return filterCatId === UNCATEGORIZED_ID
        ? tx.category_id == null
        : tx.category_id === filterCatId;
    });

    result.sort((a, b) => {
      const pendingOrder = comparePendingFirst(a, b);
      if (pendingOrder !== 0) return pendingOrder;

      const cmp =
        sortKey === "date"
          ? a.date.localeCompare(b.date)
          : sortKey === "amount"
            ? a.to_base - b.to_base
            : (a.payee ?? "").localeCompare(b.payee ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [
    transactions,
    query,
    filterCatId,
    reviewFilter,
    sortKey,
    sortDir,
    categoryMap,
    accountNames,
    tagNames,
  ]);

  const counts = useMemo(() => reviewCounts(transactions), [transactions]);

  const categoryOptions = useMemo(
    () => buildCategoryOptions(catGroups),
    [catGroups]
  );

  const payeeSuggestions = usePayeeSuggestions(dataScopeKey);

  /*
    Mirrors `filtered` so the row callbacks below don't have to depend on it.
    They are passed to memoized rows, and a new identity on every keystroke
    would defeat the memo and re-render every visible row.
  */
  const filteredRef = useRef(filtered);
  useEffect(() => {
    filteredRef.current = filtered;
  }, [filtered]);

  /*
    Runs after the list has re-rendered without the categorized row. A ref
    rather than state: this schedules a DOM side effect, not a render.

    Focus targets a specific transaction rather than a row index because the
    filtered list can reorder or remove rows before the next frame.
  */
  useEffect(() => {
    const pendingFocus = pendingFocusRef.current;
    if (pendingFocus == null) return;

    const frame = requestAnimationFrame(() => {
      const row = document.querySelector<HTMLElement>(
        `[data-tx-id="${pendingFocus.id}"]`
      );
      const selector = {
        review: "button[aria-label='Mark reviewed']",
        category: "[data-slot='combobox-trigger']",
        details: "[data-tx-details]",
      }[pendingFocus.target];
      const target = row?.querySelector<HTMLElement>(selector);
      (target ?? searchRef.current)?.focus();
      pendingFocusRef.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [filtered, visibleLimit]);

  const hasFilters =
    query !== "" || filterCatId !== null || reviewFilter !== "all";
  const matchingSpend = useMemo(
    () =>
      hasFilters
        ? filterSpendTransactions(filtered, categoryMap).reduce(
            (s, tx) => s + tx.to_base,
            0
          )
        : 0,
    [hasFilters, filtered, categoryMap]
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const handleCategoryChange = useCallback(
    (txId: number, newCatId: number | null) => {
      const current = filteredRef.current;
      const index = current.findIndex((tx) => tx.id === txId);
      const transaction = current[index];
      if (!transaction) return;
      const patch = inlineCategoryPatch(transaction, newCatId);
      const shouldReview = patch.status === "reviewed";

      const removesRow =
        (filterCatId !== null &&
          (newCatId ?? UNCATEGORIZED_ID) !== filterCatId) ||
        (reviewFilter === "unreviewed" && shouldReview);
      if (removesRow) {
        const next = current[index + 1] ?? current[index - 1];
        pendingFocusRef.current = { id: next?.id, target: "category" };
      }

      if (shouldReview) {
        setSelection((selection) => {
          if (selection.month !== monthKey || !selection.ids.has(txId))
            return selection;
          const ids = new Set(selection.ids);
          ids.delete(txId);
          return { month: monthKey, ids };
        });
      }
      void update(txId, patch);
      if (removesRow) return false;
    },
    [filterCatId, monthKey, reviewFilter, update]
  );

  const handlePayeeChange = useCallback(
    (id: number, payee: string) => void update(id, { payee }),
    [update]
  );

  const handleTagsChange = useCallback(
    (id: number, tagIds: number[]) => void update(id, { tag_ids: tagIds }),
    [update]
  );

  function setCategoryFilter(id: number | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === null) params.delete("category");
    else params.set("category", id.toString());
    router.replace(`/transactions?${params}`, { scroll: false });
  }

  const handleOpen = useCallback(
    (id: number) => setEditing({ month: monthKey, id }),
    [monthKey]
  );

  const setSelected = useCallback(
    (id: number, selected: boolean) => {
      setSelection((current) => {
        const next = new Set(current.month === monthKey ? current.ids : []);
        if (selected) next.add(id);
        else next.delete(id);
        return { month: monthKey, ids: next };
      });
    },
    [monthKey]
  );

  const handleReview = useCallback(
    (id: number, reviewed: boolean) => {
      if (reviewFilter === "unreviewed" && reviewed) {
        const current = filteredRef.current;
        const index = current.findIndex((transaction) => transaction.id === id);
        const next = current[index + 1] ?? current[index - 1];
        pendingFocusRef.current = { id: next?.id, target: "review" };
      }
      if (reviewed) setSelected(id, false);
      void update(id, { status: reviewed ? "reviewed" : "unreviewed" });
    },
    [reviewFilter, setSelected, update]
  );

  const selectedSaving = [...selectedIds].some((id) => savingIds.has(id));
  const selectable = filtered.filter(
    (tx) => isReviewableTransaction(tx) || canGroupTransaction(tx)
  );
  const selectedTransactions = transactions.filter((tx) =>
    selectedIds.has(tx.id)
  );
  const bulkEditable = selectedTransactions.filter(isReviewableTransaction);
  const canGroupSelection =
    selectedTransactions.length >= 2 &&
    selectedTransactions.every(canGroupTransaction);
  const allSelected =
    selectable.length > 0 && selectable.every((tx) => selectedIds.has(tx.id));

  const editingTransaction =
    editing?.month !== monthKey
      ? null
      : (transactions.find((transaction) => transaction.id === editing.id) ??
        null);

  if (!hasDataSource) return <ConnectionPrompt />;

  return (
    <div>
      <header className="mb-page-gap flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <PageTitle>Transactions</PageTitle>
        <MonthSelector
          year={selectedYear}
          month={selectedMonth}
          onPrev={onPrev}
          onNext={onNext}
          onToday={onToday}
          className="mb-0"
          refreshing={refreshing || pending}
        />
      </header>

      <PageSidebarLayout>
        <PageSidebar
          aria-labelledby="transactions-month-summary"
          className="@page-sidebar/main:sticky @page-sidebar/main:top-page-gap"
        >
          <PageSidebarHeading id="transactions-month-summary">
            Month summary
          </PageSidebarHeading>
          <MonthSummary
            transactions={transactions}
            categoryMap={categoryMap}
            primaryCurrency={primaryCurrency}
            loading={loading}
            error={error}
            selectedCategoryId={filterCatId}
            onCategorySelect={(id) => {
              if (id === filterCatId) {
                setCategoryFilter(null);
                return;
              }
              setQuery("");
              setReviewFilter("all");
              setCategoryFilter(id);
            }}
          />
        </PageSidebar>
        <section
          aria-label="Transaction list"
          className="@container/ledger min-w-0 @page-sidebar/main:col-start-1 @page-sidebar/main:row-start-1"
        >
          <div className="mb-2 grid grid-cols-transaction-search gap-2 @xl/ledger:grid-cols-2 @2xl/ledger:grid-cols-transaction-toolbar">
            <SegmentedControl
              label="Transaction status"
              value={reviewFilter}
              onChange={setReviewFilter}
              className="col-span-full flex-wrap @2xl/ledger:col-span-1"
              options={(
                [
                  ["all", "All", transactions.length],
                  ["unreviewed", "Needs review", counts.unreviewed],
                  ["pending", "Pending", counts.pending],
                  ["attention", "Attention", counts.attention],
                ] as const
              ).map(([value, label, count]) => ({
                value,
                ariaLabel: `${label} ${loading ? "" : count}`.trim(),
                label: (
                  <>
                    {value === "unreviewed" ? (
                      <>
                        <span className="@md/ledger:hidden">Review</span>
                        <span className="hidden @md/ledger:inline">
                          {label}
                        </span>
                      </>
                    ) : (
                      label
                    )}{" "}
                    <span className="tabular-nums">
                      {loading ? "…" : count}
                    </span>
                  </>
                ),
              }))}
            />
            <SearchField
              ref={searchRef}
              label="Search transactions"
              value={query}
              onChange={setQuery}
              shortcutHint={
                <Kbd className="pointer-events-none absolute top-1/2 right-2 z-10 hidden -translate-y-1/2 @2xl/ledger:inline-flex">
                  /
                </Kbd>
              }
            />

            <CategoryFilterPicker
              categoryId={filterCatId}
              options={categoryOptions}
              onChange={setCategoryFilter}
            />

            <div className="min-w-0 @xl/ledger:hidden">
              <Select
                value={`${sortKey}-${sortDir}`}
                onValueChange={(value) => {
                  if (!value) return;
                  const [key, direction] = value.split("-");
                  setSortKey(key as SortKey);
                  setSortDir(direction as SortDir);
                }}
              >
                <SelectTrigger
                  aria-label="Sort transactions"
                  size="sm"
                  title="Sort transactions"
                  className="w-8 justify-center p-0 @lg/ledger:w-full @lg/ledger:justify-between @lg/ledger:px-2.5 @lg/ledger:text-xs [&>svg:last-child]:hidden @lg/ledger:[&>svg:last-child]:block"
                >
                  <span className="text-bento-subtle @lg/ledger:hidden">
                    <ArrowDownUp aria-hidden="true" className="size-3.5" />
                  </span>
                  <span className="hidden @lg/ledger:block">
                    <SelectValue>
                      {(value: string) =>
                        ({
                          "date-desc": "Newest first",
                          "date-asc": "Oldest first",
                          "amount-desc": "Amount: high to low",
                          "amount-asc": "Amount: low to high",
                          "payee-asc": "Name: A to Z",
                          "payee-desc": "Name: Z to A",
                        })[value] ?? "Newest first"
                      }
                    </SelectValue>
                  </span>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} align="end">
                  <SelectItem value="date-desc">Newest first</SelectItem>
                  <SelectItem value="date-asc">Oldest first</SelectItem>
                  <SelectItem value="amount-desc">
                    Amount: high to low
                  </SelectItem>
                  <SelectItem value="amount-asc">
                    Amount: low to high
                  </SelectItem>
                  <SelectItem value="payee-asc">Name: A to Z</SelectItem>
                  <SelectItem value="payee-desc">Name: Z to A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table header */}
          <div
            className={cn(
              "grid items-center gap-x-1 px-2 text-xs font-semibold text-bento-subtle @xl/ledger:gap-x-2",
              TRANSACTION_GRID_COLUMNS
            )}
          >
            <button
              type="button"
              aria-label={
                allSelected
                  ? "Deselect all matching transactions"
                  : "Select all matching transactions"
              }
              title={
                allSelected
                  ? "Deselect all matching transactions"
                  : "Select all matching transactions"
              }
              disabled={selectable.length === 0 || loading}
              aria-pressed={allSelected}
              className="flex min-h-8 items-center justify-center rounded-lg disabled:opacity-40"
              onClick={() => {
                setSelection({
                  month: monthKey,
                  ids: allSelected
                    ? new Set()
                    : new Set(selectable.map((transaction) => transaction.id)),
                });
              }}
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded border",
                  allSelected &&
                    "border-bento-brand bg-bento-brand text-bento-brand-fg"
                )}
              >
                {allSelected ? (
                  <Check className="size-3" />
                ) : selectedIds.size > 0 ? (
                  <Minus className="size-3" />
                ) : null}
              </span>
            </button>
            <button
              className="hidden min-h-8 pl-10 text-left hover:text-bento-default @xl/ledger:block"
              onClick={() => toggleSort("payee")}
            >
              Description{" "}
              <SortIcon active={sortKey === "payee"} dir={sortDir} />
            </button>
            <span className="pl-10 @xl/ledger:hidden">Description</span>
            <span className="hidden pl-2 @xl/ledger:block">Category</span>
            <button
              className="hidden min-h-8 text-center hover:text-bento-default @xl/ledger:block"
              onClick={() => toggleSort("date")}
            >
              Date <SortIcon active={sortKey === "date"} dir={sortDir} />
            </button>
            <button
              className="hidden min-h-8 text-right hover:text-bento-default @xl/ledger:block"
              onClick={() => toggleSort("amount")}
            >
              Amount <SortIcon active={sortKey === "amount"} dir={sortDir} />
            </button>
            <span className="text-center">Tags</span>
            <span className="sr-only">Review status</span>
          </div>

          {loading ? (
            <TransactionListLoading />
          ) : error ? (
            <p className="text-sm text-bento-danger">{error}</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-bento-hairline bg-card px-6 py-12 text-center">
              <p className="font-medium">
                {transactions.length === 0
                  ? "No transactions this month"
                  : reviewFilter === "unreviewed" && counts.unreviewed === 0
                    ? "You’re all caught up"
                    : "No matching transactions"}
              </p>
              <p className="mt-2 text-sm text-bento-subtle">
                {transactions.length === 0
                  ? "Choose another month to review your activity."
                  : reviewFilter === "unreviewed" && counts.unreviewed === 0
                    ? "Every eligible transaction this month has been reviewed."
                    : "Try a different search or clear your filters."}
              </p>
              {hasFilters && (
                <Button
                  variant="outline"
                  className="mt-4 h-10"
                  onClick={() => {
                    setQuery("");
                    setReviewFilter("all");
                    setCategoryFilter(null);
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div
                aria-busy={refreshing || pending}
                inert={refreshing || pending}
                className="relative divide-y divide-bento-hairline/50 overflow-hidden rounded-2xl glass"
              >
                {filtered.slice(0, visibleLimit).map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    categoryName={
                      (tx.category_id != null
                        ? categoryMap.get(tx.category_id)
                        : undefined
                      )?.name ?? UNCATEGORIZED.name
                    }
                    accountName={
                      tx.manual_account_id != null
                        ? accountNames.get(`manual-${tx.manual_account_id}`)
                        : tx.plaid_account_id != null
                          ? accountNames.get(`plaid-${tx.plaid_account_id}`)
                          : "Cash transaction"
                    }
                    recurringMatch={recurringMatch(
                      tx.recurring_id,
                      recurringItems
                    )}
                    categoryOptions={categoryOptions}
                    tags={tags}
                    payeeSuggestions={payeeSuggestions}
                    saving={savingIds.has(tx.id)}
                    error={errors.get(tx.id)}
                    selected={selectedIds.has(tx.id)}
                    onSelect={setSelected}
                    onOpen={handleOpen}
                    onPayeeChange={handlePayeeChange}
                    onCategoryChange={handleCategoryChange}
                    onTagsChange={handleTagsChange}
                    onReview={handleReview}
                  />
                ))}
              </div>

              <div className="mt-page-gap flex flex-wrap items-center justify-between gap-2 text-xs text-bento-subtle tabular-nums">
                <span>
                  {filtered.length > visibleLimit && `${visibleLimit} of `}
                  {filtered.length}{" "}
                  {filtered.length === 1 ? "transaction" : "transactions"}
                </span>
                {hasFilters && (
                  <span>
                    Matching spend{" "}
                    <span className="font-semibold text-bento-default">
                      {formatCurrency(matchingSpend, primaryCurrency, true)}
                    </span>
                  </span>
                )}
                {filtered.length > visibleLimit && (
                  <Button
                    variant="outline"
                    className="h-10"
                    onClick={() => {
                      pendingFocusRef.current = {
                        id: filtered[visibleLimit].id,
                        target: "details",
                      };
                      setListPage({
                        scope: listScope,
                        limit: visibleLimit + TRANSACTIONS_PER_PAGE,
                      });
                    }}
                  >
                    Show more
                  </Button>
                )}
              </div>
            </>
          )}
          {selectedTransactions.length > 0 && (
            <div
              role="group"
              aria-label="Selected transaction actions"
              className="sticky bottom-3 z-10 mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-bento-default px-3 py-2 text-sm text-bento-base shadow-xl ring-1 ring-bento-base/25"
            >
              <span
                role="status"
                className="mr-auto px-1 font-medium tabular-nums"
              >
                {selectedTransactions.length} selected
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={selectedSaving || bulkEditable.length === 0}
                onClick={() => setBulkEditMonth(monthKey)}
              >
                Bulk edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-bento-base hover:bg-bento-base/15 hover:text-bento-base dark:hover:bg-bento-base/15"
                disabled={!canGroupSelection || selectedSaving}
                onClick={() =>
                  setStructure({
                    type: "group-create",
                    transactions: selectedTransactions,
                  })
                }
              >
                Group transactions
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-bento-base hover:bg-bento-base/15 hover:text-bento-base dark:hover:bg-bento-base/15"
                disabled={selectedSaving}
                onClick={() =>
                  setSelection({ month: monthKey, ids: new Set() })
                }
              >
                Clear
              </Button>
            </div>
          )}
        </section>
      </PageSidebarLayout>

      {bulkEditMonth === monthKey && (
        <BulkEditDialog
          key={monthKey}
          transactions={bulkEditable}
          categories={categoryOptions}
          tags={tags}
          onClose={() => setBulkEditMonth(undefined)}
          onSave={async (edit) => {
            await editMany(
              bulkEditable.map(({ id }) => id),
              edit
            );
            setSelection((current) =>
              current.month === monthKey
                ? { month: monthKey, ids: new Set() }
                : current
            );
          }}
        />
      )}
      {editingTransaction && (
        <TransactionEditor
          key={editingTransaction.id}
          transaction={editingTransaction}
          monthTransactions={transactions}
          categoryOptions={categoryOptions}
          accounts={accounts}
          tags={tags}
          recurringItems={recurringItems}
          recurringItemsLoading={recurringItemsLoading}
          recurringItemsError={recurringItemsError}
          onRefreshRecurringItems={refreshRecurringItems}
          isDemo={isDemo}
          payeeSuggestions={payeeSuggestions}
          saving={savingIds.has(editingTransaction.id)}
          error={errors.get(editingTransaction.id)}
          onClose={() => setEditing(null)}
          onSave={(patch) => update(editingTransaction.id, patch)}
          onDelete={async () => {
            const deleted = await remove(editingTransaction.id);
            if (deleted) setSelected(editingTransaction.id, false);
            return deleted;
          }}
          onSplit={() => {
            setStructure({ type: "split", transaction: editingTransaction });
            setEditing(null);
          }}
          onGroup={() => {
            setStructure({ type: "group", id: editingTransaction.id });
            setEditing(null);
          }}
        />
      )}
      {structure?.type === "split" && (
        <SplitEditor
          key={`split-${structure.transaction.id}`}
          transaction={structure.transaction}
          categories={categoryOptions}
          tags={tags}
          recurringItems={recurringItems}
          isDemo={isDemo}
          onClose={() => setStructure(null)}
          onCommitted={refresh}
        />
      )}
      {structure?.type === "group" && (
        <GroupEditor
          key={`group-${structure.id}`}
          groupId={structure.id}
          categories={categoryOptions}
          onClose={() => setStructure(null)}
          onCommitted={refresh}
        />
      )}
      {structure?.type === "group-create" && (
        <GroupEditor
          key={`group-create-${structure.transactions.map((tx) => tx.id).join("-")}`}
          transactions={structure.transactions}
          categories={categoryOptions}
          onClose={() => setStructure(null)}
          onCommitted={async () => {
            try {
              await refresh();
            } finally {
              setSelection({ month: monthKey, ids: new Set() });
            }
          }}
        />
      )}
    </div>
  );
}

export default function TransactionsPageWrapper() {
  return (
    <Suspense
      fallback={
        <div>
          <PageTitle className="mb-page-gap">Transactions</PageTitle>
          <TransactionListLoading />
        </div>
      }
    >
      <TransactionsPage />
    </Suspense>
  );
}
