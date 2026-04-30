"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToken } from "@/hooks/use-token";
import {
  getCategories,
  getTransactionsForMonth,
  updateTransactionCategory,
  updateTransactionNotes,
  type Transaction,
} from "@/lib/lunchmoney/client";
import {
  buildCategoryData,
  filterSpendTransactions,
  type CategoryGroupEntry,
} from "@/lib/lunchmoney/analytics";
import { CategoryIcon } from "@/lib/lunchmoney/category-icons";
import { type CategoryInfo, UNCATEGORIZED } from "@/lib/lunchmoney/categories";
import { formatAmount, formatShortDate } from "@/lib/format";
import { NoTokenPrompt } from "@/components/no-token-prompt";
import { useMonthNavigation } from "@/hooks/use-month-navigation";
import { useFetchStatus } from "@/hooks/use-fetch-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { MonthSelector } from "@/components/dashboard/month-selector";
import { cn } from "@/lib/utils";
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
import { useSwipeNavigation } from "@/hooks/use-swipe-navigation";
import { isCurrentOrFutureMonth } from "@/lib/date-utils";

type SortKey = "date" | "amount" | "payee";
type SortDir = "asc" | "desc";

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
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [expandedTxId, setExpandedTxId] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<number, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<number | null>(null);

  const swipe = useSwipeNavigation({
    onSwipeLeft: () => {
      if (!isCurrentOrFutureMonth(selectedYear, selectedMonth)) onNext();
    },
    onSwipeRight: onPrev,
  });

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

  async function handleNotesBlur(txId: number) {
    if (!isAuthenticated) return;
    const tx = transactions.find((t) => t.id === txId);
    const draft = notesDraft[txId] ?? "";
    const current = tx?.notes ?? "";
    if (draft === current) return;
    setSavingNoteId(txId);
    try {
      await updateTransactionNotes(txId, draft || null);
      setTransactions((prev) =>
        prev.map((t) => (t.id === txId ? { ...t, notes: draft || null } : t))
      );
    } finally {
      setSavingNoteId(null);
    }
  }

  async function handleCategoryChange(txId: number, newCatId: number | null) {
    if (!isAuthenticated) return;
    setUpdatingId(txId);
    try {
      await updateTransactionCategory(txId, newCatId);
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === txId ? { ...tx, category_id: newCatId } : tx
        )
      );
    } finally {
      setUpdatingId(null);
      setEditingCatId(null);
    }
  }

  if (!isAuthenticated) return <NoTokenPrompt />;

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      <span className="ml-0.5 text-[10px]">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    ) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6" {...swipe}>
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
          Payee <SortIcon k="payee" />
        </button>
        <button className="hidden text-left hover:text-bento-default sm:block">
          Category
        </button>
        <button
          className="hidden text-center hover:text-bento-default sm:block"
          onClick={() => toggleSort("date")}
        >
          Date <SortIcon k="date" />
        </button>
        <button
          className="text-right hover:text-bento-default"
          onClick={() => toggleSort("amount")}
        >
          Amount <SortIcon k="amount" />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg bg-bento-muted"
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
        <div className="divide-y divide-bento-hairline/50 overflow-hidden rounded-xl border border-bento-hairline">
          {filtered.map((tx) => {
            const category =
              tx.category_id != null
                ? (categoryMap.get(tx.category_id) ?? UNCATEGORIZED)
                : UNCATEGORIZED;
            const isCredit = parseFloat(tx.amount) < 0;
            const isUncategorized = tx.category_id == null;
            const isEditing = editingCatId === tx.id;
            const isUpdating = updatingId === tx.id;
            const isExpanded = expandedTxId === tx.id;
            const isSavingNote = savingNoteId === tx.id;

            return (
              <div
                key={tx.id}
                className="bg-bento-base transition-colors hover:bg-bento-muted/30"
              >
                {/* Row */}
                <div
                  className="grid cursor-pointer grid-cols-[1fr_80px] items-center gap-4 px-4 py-3 sm:grid-cols-[1fr_160px_72px_96px]"
                  onClick={() => handleRowClick(tx.id)}
                >
                  {/* Payee */}
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bento-muted text-bento-subtle">
                      <CategoryIcon name={category.name} className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{tx.payee}</p>
                      {!isExpanded && tx.notes && (
                        <p className="truncate text-xs text-bento-subtle">
                          {tx.notes}
                        </p>
                      )}
                      <span className="font-mono text-[10px] text-bento-subtle sm:hidden">
                        {formatShortDate(tx.date)}
                      </span>
                    </div>
                  </div>

                  {/* Category */}
                  <div
                    className="hidden min-w-0 sm:block"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isEditing ? (
                      <Select
                        value={tx.category_id?.toString() ?? ""}
                        onValueChange={(val) =>
                          handleCategoryChange(
                            tx.id,
                            val === "" ? null : Number(val)
                          )
                        }
                        onOpenChange={(open) => {
                          if (!open) setEditingCatId(null);
                        }}
                        disabled={isUpdating}
                      >
                        <SelectTrigger size="sm" className="h-7 w-full text-xs">
                          <SelectValue>
                            {tx.category_id == null
                              ? "Uncategorized"
                              : (categoryMap.get(tx.category_id)?.name ??
                                "Uncategorized")}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="min-w-max">
                          <SelectGroup>
                            <SelectItem value="">Uncategorized</SelectItem>
                          </SelectGroup>
                          <SelectSeparator />
                          <CategorySelectItems catGroups={catGroups} />
                        </SelectContent>
                      </Select>
                    ) : (
                      <button
                        className={cn(
                          "w-full truncate rounded px-1.5 py-0.5 text-left text-xs transition-colors hover:bg-bento-muted",
                          isUncategorized
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-bento-subtle"
                        )}
                        onClick={() => setEditingCatId(tx.id)}
                      >
                        {category.name}
                      </button>
                    )}
                  </div>

                  {/* Date */}
                  <span className="hidden text-center text-xs text-bento-subtle tabular-nums sm:block">
                    {formatShortDate(tx.date)}
                  </span>

                  {/* Amount */}
                  <span
                    className={cn(
                      "text-right font-mono text-sm font-medium tabular-nums",
                      isCredit && "text-green-600 dark:text-green-400"
                    )}
                  >
                    {isCredit ? "+" : "−"}
                    {formatAmount(Math.abs(parseFloat(tx.amount)), true)}
                  </span>
                </div>

                {/* Notes panel */}
                {isExpanded && (
                  <div className="border-t border-bento-hairline/50 px-4 pt-2 pb-3">
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
                      onBlur={() => handleNotesBlur(tx.id)}
                      disabled={isSavingNote}
                      autoFocus
                      className="resize-none text-sm"
                    />
                    {isSavingNote && (
                      <p className="mt-1 text-xs text-bento-subtle">Saving…</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
