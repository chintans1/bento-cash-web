"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence } from "motion/react";
import {
  buildCategoryOptions,
  CategoryFilterPicker,
} from "@/components/transactions/category-picker";
import { TransactionRow } from "@/components/transactions/transaction-row";
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
import { ButtonGroup } from "@/components/ui/button-group";
import { Skeleton } from "@/components/ui/skeleton";

type SortKey = "date" | "amount" | "payee";
type SortDir = "asc" | "desc";

/** The "Uncategorized" option in the category filter. */
const UNCATEGORIZED_FILTER = -1;

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

function TransactionsPage() {
  const { isAuthenticated } = useToken();
  const {
    primaryCurrency,
    categoryMap,
    catGroups,
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
    failedId,
    setCategory,
    setPayee,
    setNotes,
  } = useMonthTransactions(selectedYear, selectedMonth, isAuthenticated);

  // Categories come from the app-level fetch, so rows wait on them too — a row
  // rendered before they land would read "Uncategorized".
  const loading = monthLoading || appLoading;
  const error = monthError || appError;

  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  /** Transaction id whose category picker should take focus once the list settles. */
  const pendingFocusRef = useRef<number | null>(null);
  const categoryParam = searchParams.get("category");
  const filterCatId = categoryParam !== null ? Number(categoryParam) : null;
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedTxId, setExpandedTxId] = useState<number | null>(null);
  // Only one row is open at a time, so one draft is all that's needed.
  const [notesDraft, setNotesDraft] = useState("");

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
        !tx.notes?.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (filterCatId === null) return true;
      return filterCatId === UNCATEGORIZED_FILTER
        ? tx.category_id == null
        : tx.category_id === filterCatId;
    });

    result.sort((a, b) => {
      const cmp =
        sortKey === "date"
          ? a.date.localeCompare(b.date)
          : sortKey === "amount"
            ? parseFloat(a.amount) - parseFloat(b.amount)
            : (a.payee ?? "").localeCompare(b.payee ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [transactions, query, filterCatId, sortKey, sortDir]);

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

    Focus targets a specific transaction rather than a row index, because the
    categorized row lingers in the DOM for its exit animation — an index would
    land on the row that is on its way out, and focus would fall to <body> when
    it finally left.
  */
  useEffect(() => {
    const nextId = pendingFocusRef.current;
    if (nextId == null) return;
    pendingFocusRef.current = null;

    const frame = requestAnimationFrame(() => {
      const row = document.querySelector<HTMLElement>(
        `[data-tx-id="${nextId}"]`
      );
      const picker = row?.querySelector<HTMLElement>("[role='combobox']");
      // On phones the picker is inside the closed details panel.
      const target = picker?.getClientRects().length
        ? picker
        : row?.querySelector<HTMLElement>("button[aria-controls]");
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

  const handleToggleExpand = useCallback((txId: number) => {
    setExpandedTxId((prev) => (prev === txId ? null : txId));
    setNotesDraft(
      filteredRef.current.find((tx) => tx.id === txId)?.notes ?? ""
    );
  }, []);

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
        pendingFocusRef.current =
          (remaining[index] ?? remaining.at(-1))?.id ?? null;
      }

      setCategory(txId, newCatId);
    },
    [filterCatId, setCategory]
  );

  const handleNotesCommit = useCallback(
    (txId: number) => {
      setNotes(txId, notesDraft.trim() || null);
      setExpandedTxId(null);
    },
    [notesDraft, setNotes]
  );

  const handleNotesCancel = useCallback((txId: number) => {
    setNotesDraft(
      filteredRef.current.find((tx) => tx.id === txId)?.notes ?? ""
    );
    setExpandedTxId(null);
  }, []);

  if (!isAuthenticated) return <NoTokenPrompt />;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold">Transactions</h1>
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

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <ButtonGroup className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-3.5 -translate-y-1/2 text-bento-subtle" />
          <Input
            ref={searchRef}
            className="h-10 pl-8 text-sm"
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
              variant="outline"
              size="icon-sm"
              className="h-10"
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
        </ButtonGroup>

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
      <div className="mb-1 grid grid-cols-[1fr_80px] items-center gap-4 px-3 text-xs font-semibold tracking-wide text-bento-subtle uppercase sm:grid-cols-[1fr_160px_72px_96px]">
        <button
          className="min-h-10 text-left hover:text-bento-default"
          onClick={() => toggleSort("payee")}
        >
          Payee <SortIcon active={sortKey === "payee"} dir={sortDir} />
        </button>
        <span className="hidden sm:block">Category</span>
        <button
          className="hidden min-h-10 text-center hover:text-bento-default sm:block"
          onClick={() => toggleSort("date")}
        >
          Date <SortIcon active={sortKey === "date"} dir={sortDir} />
        </button>
        <button
          className="min-h-10 text-right hover:text-bento-default"
          onClick={() => toggleSort("amount")}
        >
          Amount <SortIcon active={sortKey === "amount"} dir={sortDir} />
        </button>
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
            <AnimatePresence mode="popLayout" initial={false}>
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
                  primaryCurrency={primaryCurrency}
                  categoryOptions={categoryOptions}
                  payeeSuggestions={payeeSuggestions}
                  expanded={expandedTxId === tx.id}
                  saving={savingIds.has(tx.id)}
                  failed={failedId === tx.id}
                  notesDraft={notesDraft}
                  onToggleExpand={handleToggleExpand}
                  onPayeeChange={setPayee}
                  onCategoryChange={handleCategoryChange}
                  onNotesDraftChange={setNotesDraft}
                  onNotesCommit={handleNotesCommit}
                  onNotesCancel={handleNotesCancel}
                  pickerFinalFocus={keepFocusWhileAdvancing}
                />
              ))}
            </AnimatePresence>
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
