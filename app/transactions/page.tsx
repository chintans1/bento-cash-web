"use client";

import { useEffect, useMemo, useState } from "react";
import { useToken } from "@/hooks/use-token";
import {
  getCategories,
  getTransactionsForMonth,
  updateTransactionCategory,
  type Transaction,
} from "@/lib/lunchmoney/client";
import { buildCategoryMap } from "@/lib/lunchmoney/analytics";
import { getCategoryIcon } from "@/lib/lunchmoney/category-icons";
import { type CategoryInfo, UNCATEGORIZED } from "@/lib/lunchmoney/categories";
import { formatAmount, formatShortDate } from "@/lib/format";
import {
  MONTH_NAMES,
  isCurrentOrFutureMonth,
  prevMonthOf,
  nextMonthOf,
} from "@/lib/date-utils";
import { NoTokenPrompt } from "@/components/no-token-prompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey = "date" | "amount" | "payee";
type SortDir = "asc" | "desc";

export default function TransactionsPage() {
  const { token } = useToken();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryMap, setCategoryMap] = useState<Map<number, CategoryInfo>>(
    new Map()
  );
  const [{ loading, error }, setFetchStatus] = useState<{
    loading: boolean;
    error: string | null;
  }>({ loading: false, error: null });
  const [query, setQuery] = useState("");
  const [filterCatId, setFilterCatId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  // category_id being updated -> optimistic state
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    setFetchStatus({ loading: true, error: null });
    Promise.all([
      getTransactionsForMonth(token, selectedYear, selectedMonth),
      getCategories(token),
    ])
      .then(([txRes, catRes]) => {
        setTransactions(txRes.transactions);
        setCategoryMap(buildCategoryMap(catRes));
        setFetchStatus({ loading: false, error: null });
      })
      .catch((err) => {
        setFetchStatus({
          loading: false,
          error: err instanceof Error ? err.message : "Something went wrong",
        });
      });
  }, [token, selectedYear, selectedMonth]);

  const categories = useMemo(() => {
    const seen = new Map<number, string>();
    for (const tx of transactions) {
      if (tx.category_id != null) {
        const info = categoryMap.get(tx.category_id);
        if (info) seen.set(tx.category_id, info.name);
      }
    }
    return Array.from(seen.entries()).sort(([, a], [, b]) =>
      a.localeCompare(b)
    );
  }, [transactions, categoryMap]);

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
      filtered
        .filter((tx) => parseFloat(tx.amount) > 0)
        .reduce((s, tx) => s + parseFloat(tx.amount), 0),
    [filtered]
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  async function handleCategoryChange(txId: number, newCatId: number | null) {
    if (!token) return;
    setUpdatingId(txId);
    try {
      await updateTransactionCategory(token, txId, newCatId);
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

  if (!token) return <NoTokenPrompt />;

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      <span className="ml-0.5 text-[10px]">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    ) : null;

  return (
    <div className="mx-auto max-w-5xl px-6 pt-6 pb-10">
      {/* Month selector + title */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Transactions</h1>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">viewing for</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              const p = prevMonthOf(selectedYear, selectedMonth);
              setSelectedYear(p.year);
              setSelectedMonth(p.month);
            }}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium">
            {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isCurrentOrFutureMonth(selectedYear, selectedMonth)}
            onClick={() => {
              const n = nextMonthOf(selectedYear, selectedMonth);
              setSelectedYear(n.year);
              setSelectedMonth(n.month);
            }}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-sm"
            placeholder="Search payee or notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery("")}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          value={filterCatId ?? ""}
          onChange={(e) =>
            setFilterCatId(
              e.target.value === "" ? null : Number(e.target.value)
            )
          }
        >
          <option value="">All categories</option>
          <option value="-1">Uncategorized</option>
          {categories.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Table header */}
      <div className="mb-1 grid grid-cols-[1fr_auto_auto_auto] gap-4 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <button
          className="text-left hover:text-foreground"
          onClick={() => toggleSort("payee")}
        >
          Payee <SortIcon k="payee" />
        </button>
        <button className="text-left hover:text-foreground">Category</button>
        <button
          className="text-left hover:text-foreground"
          onClick={() => toggleSort("date")}
        >
          Date <SortIcon k="date" />
        </button>
        <button
          className="text-right hover:text-foreground"
          onClick={() => toggleSort("amount")}
        >
          Amount <SortIcon k="amount" />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No transactions match.
        </p>
      ) : (
        <div className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border">
          {filtered.map((tx) => {
            const category =
              tx.category_id != null
                ? (categoryMap.get(tx.category_id) ?? UNCATEGORIZED)
                : UNCATEGORIZED;
            const Icon = getCategoryIcon(category.name);
            const isCredit = parseFloat(tx.amount) < 0;
            const isUncategorized = tx.category_id == null;
            const isEditing = editingCatId === tx.id;
            const isUpdating = updatingId === tx.id;

            return (
              <div
                key={tx.id}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 bg-background px-4 py-3 transition-colors hover:bg-muted/30"
              >
                {/* Payee */}
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{tx.payee}</p>
                    {tx.notes && (
                      <p className="truncate text-xs text-muted-foreground">
                        {tx.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Category */}
                <div className="shrink-0">
                  {isEditing ? (
                    <select
                      autoFocus
                      disabled={isUpdating}
                      className="h-7 rounded border border-input bg-background px-1.5 text-xs text-foreground"
                      defaultValue={tx.category_id ?? ""}
                      onBlur={() => setEditingCatId(null)}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleCategoryChange(
                          tx.id,
                          val === "" ? null : Number(val)
                        );
                      }}
                    >
                      <option value="">Uncategorized</option>
                      {Array.from(categoryMap.entries()).map(([id, info]) => (
                        <option key={id} value={id}>
                          {info.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      className={cn(
                        "rounded px-1.5 py-0.5 text-xs transition-colors hover:bg-muted",
                        isUncategorized
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground"
                      )}
                      onClick={() => setEditingCatId(tx.id)}
                    >
                      {category.name}
                    </button>
                  )}
                </div>

                {/* Date */}
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {formatShortDate(tx.date)}
                </span>

                {/* Amount */}
                <span
                  className={cn(
                    "shrink-0 font-mono text-sm font-medium tabular-nums",
                    isCredit && "text-green-600 dark:text-green-400"
                  )}
                >
                  {isCredit ? "+" : "−"}
                  {formatAmount(Math.abs(parseFloat(tx.amount)), true)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer summary */}
      {!loading && filtered.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} transactions</span>
          <span className="font-mono tabular-nums">
            Total spend:{" "}
            <span className="font-semibold text-foreground">
              {formatAmount(totalSpend)}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
