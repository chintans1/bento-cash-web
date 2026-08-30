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
import { formatAmount } from "@/lib/format";
import { useRouter, useSearchParams } from "next/navigation";
import { useToken } from "@/hooks/use-token";
import {
  getCategories,
  getTransactionsForMonth,
  updateTransactionCategory,
  updateTransactionNotes,
  updateTransactionPayee,
  type Transaction,
} from "@/lib/lunchmoney/client";
import {
  buildCategoryData,
  filterSpendTransactions,
  type CategoryGroupEntry,
} from "@/lib/lunchmoney/analytics";
import { type CategoryInfo, UNCATEGORIZED } from "@/lib/lunchmoney/categories";
import { NoTokenPrompt } from "@/components/no-token-prompt";
import { useMonthNavigation } from "@/hooks/use-month-navigation";
import { isCurrentOrFutureMonth } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { MonthSelector } from "@/components/dashboard/month-selector";
import { ButtonGroup } from "@/components/ui/button-group";

type SortKey = "date" | "amount" | "payee";
type SortDir = "asc" | "desc";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = new Date();
  const {
    year: selectedYear,
    month: selectedMonth,
    onPrev,
    onNext,
    pending,
  } = useMonthNavigation(now.getFullYear(), now.getMonth() + 1);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryMap, setCategoryMap] = useState<Map<number, CategoryInfo>>(
    new Map()
  );
  const [catGroups, setCatGroups] = useState<CategoryGroupEntry[]>([]);
  /** The month currently on screen, and any failure, both tagged by month. */
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null);
  const [failure, setFailure] = useState<{
    month: string;
    message: string;
  } | null>(null);

  const monthKey = `${selectedYear}-${selectedMonth}`;
  // Derived: we're loading whenever what's rendered isn't the month selected
  // and that month hasn't already failed. No flag to keep in sync.
  const loading = loadedMonth !== monthKey && failure?.month !== monthKey;
  const error = failure?.month === monthKey ? failure.message : null;
  // A month change keeps the current rows on screen; skeletons are only for
  // the very first load, when there's nothing to keep.
  const showSkeletons = loading && transactions.length === 0;
  const refreshing = loading && transactions.length > 0;
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  /** Transaction id whose category picker should take focus once the list settles. */
  const pendingFocusRef = useRef<number | null>(null);
  const [filterCatId, setFilterCatId] = useState<number | null>(() => {
    const cat = searchParams.get("category");
    return cat !== null ? Number(cat) : null;
  });
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [failedId, setFailedId] = useState<number | null>(null);
  const [expandedTxId, setExpandedTxId] = useState<number | null>(null);
  // Only one row is open at a time, so one draft is all that's needed.
  const [notesDraft, setNotesDraft] = useState("");

  useEffect(() => {
    if (!isAuthenticated) return;

    // Guards against a slow response for a month the user has already left
    // overwriting the month they're now looking at.
    let cancelled = false;

    Promise.all([
      getTransactionsForMonth(selectedYear, selectedMonth),
      getCategories(),
    ])
      .then(([txRes, catRes]) => {
        if (cancelled) return;
        const { categoryMap, catGroups } = buildCategoryData(catRes);
        setTransactions(txRes.transactions);
        setCategoryMap(categoryMap);
        setCatGroups(catGroups);
        setLoadedMonth(monthKey);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFailure({
          month: monthKey,
          message: err instanceof Error ? err.message : "Something went wrong",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, selectedYear, selectedMonth, monthKey]);

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
    let result = [...transactions];
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.payee?.toLowerCase().includes(q) ||
          tx.notes?.toLowerCase().includes(q)
      );
    }
    if (filterCatId !== null) {
      result = result.filter((tx) =>
        filterCatId === -1
          ? tx.category_id == null
          : tx.category_id === filterCatId
      );
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = a.date.localeCompare(b.date);
      else if (sortKey === "amount")
        cmp = parseFloat(a.amount) - parseFloat(b.amount);
      else cmp = (a.payee ?? "").localeCompare(b.payee ?? "");
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
      document
        .querySelector<HTMLElement>(
          `[data-tx-id="${nextId}"] [role='combobox']`
        )
        ?.focus();
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

  const handleToggleExpand = useCallback(
    (txId: number) => {
      setExpandedTxId((prev) => (prev === txId ? null : txId));
      setNotesDraft(transactions.find((tx) => tx.id === txId)?.notes ?? "");
    },
    [transactions]
  );

  /**
   * Applies an edit to local state immediately, then persists it. The UI never
   * waits on the network; if the request fails the row snaps back to its
   * previous values and says so, so an edit is never silently lost.
   */
  const save = useCallback(
    async (
      txId: number,
      patch: Partial<Transaction>,
      persist: () => Promise<void>
    ) => {
      if (!isAuthenticated) return;

      const before = transactions.find((t) => t.id === txId);
      if (!before) return;

      setFailedId(null);
      setTransactions((prev) =>
        prev.map((t) => (t.id === txId ? { ...t, ...patch } : t))
      );
      setSavingIds((prev) => new Set(prev).add(txId));

      try {
        await persist();
      } catch {
        setTransactions((prev) =>
          prev.map((t) => (t.id === txId ? before : t))
        );
        setFailedId(txId);
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev);
          next.delete(txId);
          return next;
        });
      }
    },
    [isAuthenticated, transactions]
  );

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
      if (filterCatId === -1) {
        const current = filteredRef.current;
        const index = current.findIndex((tx) => tx.id === txId);
        const remaining = current.filter((tx) => tx.id !== txId);
        const next = remaining[index] ?? remaining.at(-1);
        pendingFocusRef.current = next?.id ?? null;
      }

      save(txId, { category_id: newCatId }, () =>
        updateTransactionCategory(txId, newCatId)
      );
    },
    [filterCatId, save]
  );

  const handlePayeeChange = useCallback(
    (txId: number, payee: string) => {
      save(txId, { payee }, () => updateTransactionPayee(txId, payee));
    },
    [save]
  );

  const handleNotesCommit = useCallback(
    (txId: number) => {
      const tx = transactions.find((t) => t.id === txId);
      const draft = notesDraft.trim();
      if (!tx || draft === (tx.notes ?? "")) return;
      save(txId, { notes: draft || null }, () =>
        updateTransactionNotes(txId, draft || null)
      );
    },
    [notesDraft, save, transactions]
  );

  const handleNotesCancel = useCallback(
    (txId: number) => {
      setNotesDraft(transactions.find((tx) => tx.id === txId)?.notes ?? "");
      setExpandedTxId(null);
    },
    [transactions]
  );

  if (!isAuthenticated) return <NoTokenPrompt />;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6">
      <MonthSelector
        year={selectedYear}
        month={selectedMonth}
        onPrev={onPrev}
        onNext={onNext}
        refreshing={refreshing || pending}
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <ButtonGroup className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-3.5 -translate-y-1/2 text-bento-subtle" />
          <Input
            ref={searchRef}
            className="h-8 pl-8 text-sm"
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
          {!query && (
            <Kbd className="pointer-events-none absolute top-1/2 right-3 z-10 -translate-y-1/2">
              /
            </Kbd>
          )}
          {query && (
            <Button
              variant="outline"
              size="icon-sm"
              className="h-8"
              disabled={!query}
              onClick={() => setQuery("")}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </ButtonGroup>

        <CategoryFilterPicker
          categoryId={filterCatId}
          options={categoryOptions}
          onChange={(newId) => {
            setFilterCatId(newId);
            const params = new URLSearchParams(searchParams.toString());
            if (newId === null) {
              params.delete("category");
            } else {
              params.set("category", newId.toString());
            }
            router.replace(`/transactions?${params.toString()}`);
          }}
        />
      </div>

      {/* Table header */}
      <div className="mb-1 grid grid-cols-[1fr_80px] gap-4 px-3 text-xs font-semibold tracking-wide text-bento-subtle uppercase sm:grid-cols-[1fr_160px_72px_96px]">
        <button
          className="text-left hover:text-bento-default"
          onClick={() => toggleSort("payee")}
        >
          Payee <SortIcon active={sortKey === "payee"} dir={sortDir} />
        </button>
        <button className="hidden text-left hover:text-bento-default sm:block">
          Category
        </button>
        <button
          className="hidden text-center hover:text-bento-default sm:block"
          onClick={() => toggleSort("date")}
        >
          Date <SortIcon active={sortKey === "date"} dir={sortDir} />
        </button>
        <button
          className="text-right hover:text-bento-default"
          onClick={() => toggleSort("amount")}
        >
          Amount <SortIcon active={sortKey === "amount"} dir={sortDir} />
        </button>
      </div>

      {showSkeletons ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg bg-bento-raised"
            />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-bento-danger">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-bento-subtle">
          No transactions match.
        </p>
      ) : (
        <div className="relative divide-y divide-bento-hairline/50 overflow-hidden rounded-4xl glass">
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
                categoryOptions={categoryOptions}
                payeeSuggestions={payeeSuggestions}
                expanded={expandedTxId === tx.id}
                saving={savingIds.has(tx.id)}
                failed={failedId === tx.id}
                notesDraft={notesDraft}
                onToggleExpand={handleToggleExpand}
                onPayeeChange={handlePayeeChange}
                onCategoryChange={handleCategoryChange}
                onNotesDraftChange={setNotesDraft}
                onNotesCommit={handleNotesCommit}
                onNotesCancel={handleNotesCancel}
                pickerFinalFocus={keepFocusWhileAdvancing}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Footer summary */}
      {!showSkeletons && filtered.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-xs text-bento-subtle">
          <span>{filtered.length} transactions</span>
          <span className="font-mono tabular-nums">
            Total spend:{" "}
            <span className="font-semibold text-bento-default">
              {formatAmount(totalSpend)}
            </span>
          </span>
        </div>
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
