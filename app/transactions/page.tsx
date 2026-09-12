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
import { TransactionEditor } from "@/components/transactions/transaction-editor";
import { usePayeeSuggestions } from "@/hooks/use-payee-suggestions";
import { formatCurrency } from "@/lib/format";
import { useRouter, useSearchParams } from "next/navigation";
import { useToken } from "@/hooks/use-token";
import { useAppData } from "@/hooks/use-app-data";
import { useMonthTransactions } from "@/hooks/use-month-transactions";
import { filterSpendTransactions } from "@/lib/lunchmoney/analytics";
import { UNCATEGORIZED } from "@/lib/lunchmoney/categories";
import { NoTokenPrompt } from "@/components/no-token-prompt";
import { useMonthNavigation } from "@/hooks/use-month-navigation";
import { isCurrentOrFutureMonth } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { MonthSelector } from "@/components/dashboard/month-selector";
import { Skeleton } from "@/components/ui/skeleton";
import {
  comparePendingFirst,
  isReviewableTransaction,
  matchesReviewFilter,
  reviewCounts,
  type ReviewFilter,
} from "@/lib/lunchmoney/transaction-state";
import { cn } from "@/lib/utils";

type SortKey = "date" | "amount" | "payee";
type SortDir = "asc" | "desc";

/** The "Uncategorized" option in the category filter. */
const UNCATEGORIZED_FILTER = -1;
const NO_SELECTION = new Set<number>();

/**
 * Arrow next to the active sort column. Declared at module scope rather than
 * inside the page so React doesn't treat it as a new component type on every
 * render.
 */
function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return null;
  return (
    <span className="ml-0.5 text-[10px]">{dir === "asc" ? "↑" : "↓"}</span>
  );
}

function parseCategoryFilter(value: string | null): number | null {
  if (value === null) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function TransactionsPage() {
  const { token, isDemo, isAuthenticated } = useToken();
  const {
    primaryCurrency,
    categoryMap,
    catGroups,
    accounts,
    tags,
    recurringItems,
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
    reviewMany,
  } = useMonthTransactions(
    selectedYear,
    selectedMonth,
    isDemo ? "demo" : token
  );

  // Categories come from the app-level fetch, so rows wait on them too — a row
  // rendered before they land would read "Uncategorized".
  const loading = monthLoading || appLoading;
  const error = monthError || appError;

  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  /** Transaction id whose category picker should take focus once the list settles. */
  const pendingFocusRef = useRef<{
    id: number;
    target: "category" | "review";
  } | null>(null);
  const categoryParam = searchParams.get("category");
  const filterCatId = parseCategoryFilter(categoryParam);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const monthKey = `${selectedYear}-${selectedMonth}`;
  const [selection, setSelection] = useState<{
    month: string;
    ids: Set<number>;
  }>({ month: monthKey, ids: new Set() });
  const selectedIds =
    selection.month === monthKey ? selection.ids : NO_SELECTION;
  const [editing, setEditing] = useState<{
    month: string;
    id: number;
  } | null>(null);

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
      return filterCatId === UNCATEGORIZED_FILTER
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
            ? parseFloat(a.amount) - parseFloat(b.amount)
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

  const payeeSuggestions = usePayeeSuggestions(isAuthenticated);

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
    pendingFocusRef.current = null;

    const frame = requestAnimationFrame(() => {
      const row = document.querySelector<HTMLElement>(
        `[data-tx-id="${pendingFocus.id}"]`
      );
      const target =
        pendingFocus.target === "review"
          ? row?.querySelector<HTMLElement>(
              "button[aria-label='Mark reviewed']"
            )
          : row?.querySelector<HTMLElement>("[role='combobox']");
      target?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [filtered]);

  const totalSpend = useMemo(
    () =>
      filterSpendTransactions(filtered, categoryMap).reduce(
        (s, tx) => s + parseFloat(tx.amount),
        0
      ),
    [filtered, categoryMap]
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  /**
   * When we're advancing to the next uncategorized row, the picker's own focus
   * restore would aim at the trigger that is about to leave the list, dropping
   * focus to <body>. Returning false leaves focus alone so the effect above can
   * place it once the new list is on screen.
   */
  const keepFocusWhileAdvancing = useCallback(
    () => (pendingFocusRef.current == null ? undefined : false),
    []
  );

  const handleCategoryChange = useCallback(
    (txId: number, newCatId: number | null) => {
      // Clearing the uncategorized queue is the one flow you repeat: the row
      // you just categorized drops out of the filter, so queue focus for
      // whatever takes its place and the next one is a keystroke away. Outside
      // that filter, moving focus would be surprising, so don't.
      if (filterCatId === UNCATEGORIZED_FILTER) {
        const current = filteredRef.current;
        const index = current.findIndex((tx) => tx.id === txId);
        const remaining = current.filter((tx) => tx.id !== txId);
        const next = remaining[index] ?? remaining.at(-1);
        pendingFocusRef.current = next
          ? { id: next.id, target: "category" }
          : null;
      }

      void update(txId, { category_id: newCatId });
    },
    [filterCatId, update]
  );

  const handlePayeeChange = useCallback(
    (id: number, payee: string) => void update(id, { payee }),
    [update]
  );

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
        const remaining = current.filter(
          (transaction) => transaction.id !== id
        );
        const next = remaining[index] ?? remaining.at(-1);
        pendingFocusRef.current = next
          ? { id: next.id, target: "review" }
          : null;
      }
      if (reviewed) setSelected(id, false);
      void update(id, { status: reviewed ? "reviewed" : "unreviewed" });
    },
    [reviewFilter, setSelected, update]
  );

  const editingTransaction =
    editing?.month !== monthKey
      ? null
      : (transactions.find((transaction) => transaction.id === editing.id) ??
        null);

  if (!isAuthenticated) return <NoTokenPrompt />;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-balance">
            Transactions
          </h1>
          <p className="mt-1 text-sm text-bento-subtle tabular-nums">
            {counts.unreviewed === 0
              ? "Everything is reviewed"
              : `${counts.unreviewed} to review`}
            {counts.pending > 0 && ` · ${counts.pending} pending`}
            {counts.attention > 0 && ` · ${counts.attention} need attention`}
          </p>
        </div>
        <MonthSelector
          year={selectedYear}
          month={selectedMonth}
          onPrev={onPrev}
          onNext={onNext}
          onToday={onToday}
          className="mb-0"
          refreshing={refreshing || pending}
        />
      </div>

      <div className="mb-4 grid grid-cols-4 items-center gap-1 rounded-full bg-bento-muted p-1 sm:flex sm:w-fit">
        {(
          [
            ["all", "All", "All", transactions.length],
            ["unreviewed", "Needs review", "Review", counts.unreviewed],
            ["pending", "Pending", "Pending", counts.pending],
            ["attention", "Attention", "Attention", counts.attention],
          ] as const
        ).map(([value, label, mobileLabel, count]) => (
          <button
            key={value}
            type="button"
            aria-pressed={reviewFilter === value}
            className={cn(
              "min-h-10 min-w-0 flex-1 rounded-full px-1 text-xs font-medium whitespace-nowrap transition-[color,background-color,box-shadow] sm:flex-none sm:px-3 sm:text-sm",
              reviewFilter === value
                ? "bg-card text-bento-default shadow-sm"
                : "text-bento-subtle hover:text-bento-default"
            )}
            onClick={() => setReviewFilter(value)}
          >
            <span className="sm:hidden">{mobileLabel}</span>
            <span className="hidden sm:inline">{label}</span>{" "}
            <span className="tabular-nums">{count}</span>
          </button>
        ))}
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-bento-default px-3 py-2 text-sm text-bento-base shadow-lg">
          <span className="mr-auto px-1 font-medium tabular-nums">
            {selectedIds.size} selected
          </span>
          <Button
            variant="secondary"
            className="h-10"
            onClick={() => {
              void reviewMany([...selectedIds]).then((saved) => {
                if (saved) setSelection({ month: monthKey, ids: new Set() });
              });
            }}
          >
            Mark reviewed
          </Button>
          <Button
            variant="ghost"
            className="h-10 text-bento-base hover:text-bento-default"
            onClick={() => setSelection({ month: monthKey, ids: new Set() })}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem]">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-3.5 -translate-y-1/2 text-bento-subtle" />
          <Input
            ref={searchRef}
            className="h-10 rounded-3xl pr-12 pl-8 text-sm"
            aria-label="Search transactions"
            placeholder="Search descriptions or notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
                e.currentTarget.blur();
              }
            }}
          />
          {query ? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-0 right-0 size-10 rounded-full"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <X className="size-3.5" />
            </Button>
          ) : (
            <Kbd className="pointer-events-none absolute top-1/2 right-3 z-10 -translate-y-1/2">
              /
            </Kbd>
          )}
        </div>

        <CategoryFilterPicker
          categoryId={filterCatId}
          options={categoryOptions}
          onChange={(newId) => {
            const params = new URLSearchParams(searchParams.toString());
            if (newId === null) params.delete("category");
            else params.set("category", newId.toString());
            router.replace(`/transactions?${params.toString()}`, {
              scroll: false,
            });
          }}
        />
      </div>

      {/* Table header */}
      <div
        className={cn(
          "mb-1 grid items-center gap-2 px-3 text-xs font-semibold tracking-wide text-bento-subtle",
          TRANSACTION_GRID_COLUMNS
        )}
      >
        <button
          type="button"
          aria-label="Select all visible transactions"
          className="min-h-10"
          onClick={() => {
            const eligible = filtered.filter(
              (transaction) =>
                transaction.status === "unreviewed" &&
                isReviewableTransaction(transaction)
            );
            setSelection({
              month: monthKey,
              ids: eligible.every((transaction) =>
                selectedIds.has(transaction.id)
              )
                ? new Set()
                : new Set(eligible.map((transaction) => transaction.id)),
            });
          }}
        >
          <span className="sr-only">Select</span>
        </button>
        <button
          className="min-h-10 text-left hover:text-bento-default"
          onClick={() => toggleSort("payee")}
        >
          Payee <SortIcon active={sortKey === "payee"} dir={sortDir} />
        </button>
        <span className="hidden pl-2 sm:block">Category</span>
        <button
          className="hidden min-h-10 text-center hover:text-bento-default sm:block"
          onClick={() => toggleSort("date")}
        >
          Date <SortIcon active={sortKey === "date"} dir={sortDir} />
        </button>
        <button
          className="hidden min-h-10 text-right hover:text-bento-default sm:block"
          onClick={() => toggleSort("amount")}
        >
          Amount <SortIcon active={sortKey === "amount"} dir={sortDir} />
        </button>
        <span />
        <span />
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-bento-danger">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-bento-hairline bg-card px-6 py-12 text-center">
          <p className="font-medium">
            {transactions.length === 0
              ? "No transactions this month"
              : "No matching transactions"}
          </p>
          <p className="mt-2 text-sm text-bento-subtle">
            {transactions.length === 0
              ? "Choose another month to review your activity."
              : "Try a different search or clear your filters."}
          </p>
          {(query || filterCatId !== null) && (
            <Button
              variant="outline"
              className="mt-4 h-10"
              onClick={() => {
                setQuery("");
                const params = new URLSearchParams(searchParams.toString());
                params.delete("category");
                router.replace(`/transactions?${params}`, { scroll: false });
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
            {filtered.map((tx) => (
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
                primaryCurrency={primaryCurrency}
                categoryOptions={categoryOptions}
                payeeSuggestions={payeeSuggestions}
                saving={savingIds.has(tx.id)}
                error={errors.get(tx.id)}
                selected={selectedIds.has(tx.id)}
                onSelect={setSelected}
                onOpen={handleOpen}
                onPayeeChange={handlePayeeChange}
                onCategoryChange={handleCategoryChange}
                onReview={handleReview}
                pickerFinalFocus={keepFocusWhileAdvancing}
              />
            ))}
          </div>

          {/* Footer summary */}
          <div className="mt-3 flex items-center justify-between text-xs text-bento-subtle">
            <span>{filtered.length} transactions</span>
            <span className="font-mono tabular-nums">
              Total spend:{" "}
              <span className="font-semibold text-bento-default">
                {formatCurrency(totalSpend, primaryCurrency)}
              </span>
            </span>
          </div>
        </>
      )}

      {editingTransaction && (
        <TransactionEditor
          key={editingTransaction.id}
          transaction={editingTransaction}
          categoryOptions={categoryOptions}
          accounts={accounts}
          tags={tags}
          recurringItems={recurringItems}
          saving={savingIds.has(editingTransaction.id)}
          error={errors.get(editingTransaction.id)}
          onClose={() => setEditing(null)}
          onSave={(patch) => update(editingTransaction.id, patch)}
        />
      )}
    </div>
  );
}

export default function TransactionsPageWrapper() {
  return (
    <Suspense>
      <TransactionsPage />
    </Suspense>
  );
}
