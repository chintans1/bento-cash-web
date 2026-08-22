"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AnimatedCollapse } from "@/components/animated-collapse";
import {
  buildCategoryOptions,
  CategoryPicker,
} from "@/components/transactions/category-picker";
import { EditableText } from "@/components/transactions/editable-text";
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
import { CategoryIcon } from "@/lib/lunchmoney/category-icons";
import { categoryColor } from "@/lib/lunchmoney/category-colors";
import { type CategoryInfo, UNCATEGORIZED } from "@/lib/lunchmoney/categories";
import { formatAmount, formatShortDate } from "@/lib/format";
import { NoTokenPrompt } from "@/components/no-token-prompt";
import { useMonthNavigation } from "@/hooks/use-month-navigation";
import { useFetchStatus } from "@/hooks/use-fetch-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Kbd } from "@/components/ui/kbd";
import { MonthSelector } from "@/components/dashboard/month-selector";
import { cn } from "@/lib/utils";
import { DURATION, EASE } from "@/lib/motion";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function CategorySelectItems({
  catGroups,
}: {
  catGroups: CategoryGroupEntry[];
}) {
  return (
    <>
      {catGroups.map((group, i) => (
        <SelectGroup key={group.groupId ?? "standalone"}>
          {group.groupName && <SelectLabel>{group.groupName}</SelectLabel>}
          {group.items.map(({ id, name }) => (
            <SelectItem key={id} value={id.toString()}>
              {name}
            </SelectItem>
          ))}
          {i < catGroups.length - 1 && <SelectSeparator />}
        </SelectGroup>
      ))}
    </>
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
  } = useMonthNavigation(now.getFullYear(), now.getMonth() + 1);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryMap, setCategoryMap] = useState<Map<number, CategoryInfo>>(
    new Map()
  );
  const [catGroups, setCatGroups] = useState<CategoryGroupEntry[]>([]);
  const [{ loading, error }, setFetchStatus] = useFetchStatus();
  const [query, setQuery] = useState("");
  const [filterCatId, setFilterCatId] = useState<number | null>(() => {
    const cat = searchParams.get("category");
    return cat !== null ? Number(cat) : null;
  });
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [failedId, setFailedId] = useState<number | null>(null);
  const [expandedTxId, setExpandedTxId] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!isAuthenticated) return;
    setFetchStatus({ loading: true, error: null });
    Promise.all([
      getTransactionsForMonth(selectedYear, selectedMonth),
      getCategories(),
    ])
      .then(([txRes, catRes]) => {
        const { categoryMap, catGroups } = buildCategoryData(catRes);
        setTransactions(txRes.transactions);
        setCategoryMap(categoryMap);
        setCatGroups(catGroups);
        setFetchStatus({ loading: false, error: null });
      })
      .catch((err) => {
        setFetchStatus({
          loading: false,
          error: err instanceof Error ? err.message : "Something went wrong",
        });
      });
  }, [isAuthenticated, selectedYear, selectedMonth, setFetchStatus]);

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

  function handleRowClick(txId: number) {
    setExpandedTxId((prev) => {
      if (prev === txId) return null;
      const tx = transactions.find((t) => t.id === txId);
      setNotesDraft((d) => ({ ...d, [txId]: tx?.notes ?? "" }));
      return txId;
    });
  }

  /**
   * Applies an edit to local state immediately, then persists it. The UI never
   * waits on the network; if the request fails the row snaps back to its
   * previous values and says so, so an edit is never silently lost.
   */
  async function save(
    txId: number,
    patch: Partial<Transaction>,
    persist: () => Promise<void>
  ) {
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
      setTransactions((prev) => prev.map((t) => (t.id === txId ? before : t)));
      setFailedId(txId);
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(txId);
        return next;
      });
    }
  }

  function handleCategoryChange(txId: number, newCatId: number | null) {
    save(txId, { category_id: newCatId }, () =>
      updateTransactionCategory(txId, newCatId)
    );
  }

  function handlePayeeChange(txId: number, payee: string) {
    save(txId, { payee }, () => updateTransactionPayee(txId, payee));
  }

  function handleNotesCommit(txId: number) {
    const tx = transactions.find((t) => t.id === txId);
    const draft = (notesDraft[txId] ?? "").trim();
    if (!tx || draft === (tx.notes ?? "")) return;
    save(txId, { notes: draft || null }, () =>
      updateTransactionNotes(txId, draft || null)
    );
  }

  if (!isAuthenticated) return <NoTokenPrompt />;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6">
      <MonthSelector
        year={selectedYear}
        month={selectedMonth}
        onPrev={onPrev}
        onNext={onNext}
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <ButtonGroup className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-3.5 -translate-y-1/2 text-bento-subtle" />
          <Input
            className="h-8 pl-8 text-sm"
            placeholder="Search payee or notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
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

        <Select
          value={filterCatId === null ? "" : filterCatId.toString()}
          onValueChange={(val) => {
            const newId = val === "" ? null : Number(val);
            setFilterCatId(newId);
            const params = new URLSearchParams(searchParams.toString());
            if (newId === null) {
              params.delete("category");
            } else {
              params.set("category", newId.toString());
            }
            router.replace(`/transactions?${params.toString()}`);
          }}
        >
          <SelectTrigger size="sm" className="w-44">
            <SelectValue className="!block truncate">
              {filterCatId === null
                ? "All categories"
                : filterCatId === -1
                  ? "Uncategorized"
                  : (categoryMap.get(filterCatId)?.name ?? "All categories")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="min-w-max">
            <SelectGroup>
              <SelectItem value="">All categories</SelectItem>
              <SelectItem value="-1">Uncategorized</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <CategorySelectItems catGroups={catGroups} />
          </SelectContent>
        </Select>
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

      {loading ? (
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
            {filtered.map((tx) => {
              const category =
                tx.category_id != null
                  ? (categoryMap.get(tx.category_id) ?? UNCATEGORIZED)
                  : UNCATEGORIZED;
              const isCredit = parseFloat(tx.amount) < 0;
              const isExpanded = expandedTxId === tx.id;
              const isSaving = savingIds.has(tx.id);
              const hasFailed = failedId === tx.id;

              return (
                <motion.div
                  key={tx.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    x: -12,
                    transition: { duration: DURATION.quick, ease: EASE },
                  }}
                  transition={{ duration: DURATION.collapse, ease: EASE }}
                  className="transition-colors hover:bg-bento-raised"
                >
                  {/* Row */}
                  <div
                    className="grid cursor-pointer grid-cols-[1fr_80px] items-center gap-4 px-4 py-3 sm:grid-cols-[1fr_160px_72px_96px]"
                    onClick={() => handleRowClick(tx.id)}
                  >
                    {/* Payee */}
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: `color-mix(in oklab, ${categoryColor(category.name)} var(--chip-tint), transparent)`,
                        }}
                      >
                        <CategoryIcon
                          name={category.name}
                          className="size-4"
                          style={{ color: categoryColor(category.name) }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <EditableText
                          value={tx.payee ?? ""}
                          placeholder="Add a description…"
                          ariaLabel={`Description: ${tx.payee}. Edit`}
                          onCommit={(next) => handlePayeeChange(tx.id, next)}
                        />
                        {!isExpanded && tx.notes && (
                          <p className="truncate px-1.5 text-xs text-bento-subtle">
                            {tx.notes}
                          </p>
                        )}
                        <span className="px-1.5 font-mono text-[10px] text-bento-subtle sm:hidden">
                          {formatShortDate(tx.date)}
                        </span>
                        {hasFailed && (
                          <p className="px-1.5 text-xs text-bento-negative">
                            Couldn&apos;t save — change reverted.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Category */}
                    <div
                      className="hidden min-w-0 sm:block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <CategoryPicker
                        categoryId={tx.category_id}
                        categoryName={category.name}
                        options={categoryOptions}
                        saving={isSaving}
                        onChange={(newCatId) =>
                          handleCategoryChange(tx.id, newCatId)
                        }
                      />
                    </div>

                    {/* Date */}
                    <span className="hidden text-center text-xs text-bento-subtle tabular-nums sm:block">
                      {formatShortDate(tx.date)}
                    </span>

                    {/* Amount */}
                    <span
                      className={cn(
                        "text-right font-mono text-sm font-medium tabular-nums",
                        isCredit && "text-bento-positive"
                      )}
                    >
                      {isCredit ? "+" : "−"}
                      {formatAmount(Math.abs(parseFloat(tx.amount)), true)}
                    </span>
                  </div>

                  {/* Detail panel */}
                  <AnimatedCollapse open={isExpanded}>
                    <div
                      className="flex flex-col gap-2 border-t border-bento-hairline/50 px-4 pt-2 pb-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* the row's category cell is hidden on small screens */}
                      <div className="sm:hidden">
                        <CategoryPicker
                          categoryId={tx.category_id}
                          categoryName={category.name}
                          options={categoryOptions}
                          saving={isSaving}
                          onChange={(newCatId) =>
                            handleCategoryChange(tx.id, newCatId)
                          }
                        />
                      </div>
                      <Textarea
                        rows={2}
                        placeholder="Add a note…"
                        value={notesDraft[tx.id] ?? ""}
                        onChange={(e) =>
                          setNotesDraft((d) => ({
                            ...d,
                            [tx.id]: e.target.value,
                          }))
                        }
                        onBlur={() => handleNotesCommit(tx.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            handleNotesCommit(tx.id);
                            setExpandedTxId(null);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            setNotesDraft((d) => ({
                              ...d,
                              [tx.id]: tx.notes ?? "",
                            }));
                            setExpandedTxId(null);
                          }
                        }}
                        autoFocus
                        className="resize-none text-sm"
                      />
                      <p className="text-[11px] text-bento-subtle">
                        <Kbd>⌘</Kbd>
                        <Kbd>↵</Kbd> to save · <Kbd>esc</Kbd> to cancel
                      </p>
                    </div>
                  </AnimatedCollapse>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Footer summary */}
      {!loading && filtered.length > 0 && (
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
