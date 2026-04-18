import type { CategoriesResponse, Transaction } from "./client";
import type { CategoryInfo } from "./categories";

export type CategoryGroupEntry = {
  /** null = ungrouped standalone categories */
  groupId: number | null;
  groupName: string | null;
  items: { id: number; name: string }[];
};

/**
 * Builds both the flat category map and the grouped Select structure in a
 * single pass over the categories response. Groups with children come first;
 * standalone categories (no children) are appended at the end.
 */
export function buildCategoryData(res: CategoriesResponse): {
  categoryMap: Map<number, CategoryInfo>;
  catGroups: CategoryGroupEntry[];
} {
  const categoryMap = new Map<number, CategoryInfo>();
  const groups: CategoryGroupEntry[] = [];
  const standalone: { id: number; name: string }[] = [];

  for (const cat of res.categories) {
    categoryMap.set(cat.id, {
      name: cat.name,
      is_income: cat.is_income,
      exclude_from_totals: cat.exclude_from_totals,
    });

    if (cat.children && cat.children.length > 0) {
      groups.push({
        groupId: cat.id,
        groupName: cat.name,
        items: cat.children.map((c) => ({ id: c.id, name: c.name })),
      });
      for (const child of cat.children) {
        categoryMap.set(child.id, {
          name: child.name,
          is_income: child.is_income,
          exclude_from_totals: child.exclude_from_totals,
        });
      }
    } else {
      standalone.push({ id: cat.id, name: cat.name });
    }
  }

  if (standalone.length > 0) {
    groups.push({ groupId: null, groupName: null, items: standalone });
  }

  return { categoryMap, catGroups: groups };
}

export type CategoryTotal = {
  id: number;
  name: string;
  spend: number;
  txCount: number;
};

export type MerchantTotal = {
  payee: string;
  spend: number;
  txCount: number;
};

export type DailySpend = {
  date: string; // YYYY-MM-DD
  amount: number;
};

export type MoMDelta = {
  categoryId: number;
  currentSpend: number;
  prevSpend: number;
  /** percentage change; null when no prev spend to compare against */
  pct: number | null;
};

export function buildCategoryMap(
  res: CategoriesResponse
): Map<number, CategoryInfo> {
  const map = new Map<number, CategoryInfo>();

  for (const cat of res.categories) {
    map.set(cat.id, {
      name: cat.name,
      is_income: cat.is_income,
      exclude_from_totals: cat.exclude_from_totals,
    });

    for (const child of cat.children ?? []) {
      map.set(child.id, {
        name: child.name,
        is_income: child.is_income,
        exclude_from_totals: child.exclude_from_totals,
      });
    }
  }

  return map;
}

export function filterExpenses(transactions: Transaction[]): Transaction[] {
  return transactions.filter((tx) => parseFloat(tx.amount) > 0);
}

/**
 * Filters to expense transactions that should count toward totals —
 * positive amount AND not in an exclude_from_totals category (e.g. Transfers).
 */
export function filterSpendTransactions(
  transactions: Transaction[],
  catMap: Map<number, CategoryInfo>
): Transaction[] {
  return transactions.filter((tx) => {
    if (parseFloat(tx.amount) <= 0) {
      return false;
    }

    if (tx.category_id != null) {
      const cat = catMap.get(tx.category_id);
      if (cat?.exclude_from_totals) {
        return false;
      }
    }
    return true;
  });
}

export function computeCategoryTotals(
  transactions: Transaction[],
  catMap: Map<number, CategoryInfo>,
  limit = 10
): CategoryTotal[] {
  const map = new Map<number, CategoryTotal>();
  for (const tx of filterSpendTransactions(transactions, catMap)) {
    const catId = tx.category_id ?? -1;
    const cat = catMap.get(catId);
    const name = cat?.name ?? "Uncategorized";
    const prev = map.get(catId) ?? { id: catId, name, spend: 0, txCount: 0 };
    map.set(catId, {
      ...prev,
      spend: prev.spend + parseFloat(tx.amount),
      txCount: prev.txCount + 1,
    });
  }
  return Array.from(map.values())
    .sort((a, b) => b.spend - a.spend)
    .slice(0, limit);
}

/** Returns top merchants (by payee) sorted by spend descending. */
export function computeMerchantTotals(
  transactions: Transaction[],
  catMap: Map<number, CategoryInfo>,
  limit = 10
): MerchantTotal[] {
  const map = new Map<string, MerchantTotal>();
  for (const tx of filterSpendTransactions(transactions, catMap)) {
    const payee = tx.payee?.trim() || "Unknown";
    const prev = map.get(payee) ?? { payee, spend: 0, txCount: 0 };
    map.set(payee, {
      payee,
      spend: prev.spend + parseFloat(tx.amount),
      txCount: prev.txCount + 1,
    });
  }
  return Array.from(map.values())
    .sort((a, b) => b.spend - a.spend)
    .slice(0, limit);
}

/** Returns per-day spend for the given year/month. Days with no spending are omitted. */
export function computeDailySpend(
  transactions: Transaction[],
  catMap: Map<number, CategoryInfo>,
  year: number,
  month: number
): DailySpend[] {
  const map = new Map<string, number>();
  const daysInMonth = new Date(year, month, 0).getDate();
  // Initialize all days to 0 so the chart has a full x-axis
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    map.set(key, 0);
  }
  for (const tx of filterSpendTransactions(transactions, catMap)) {
    map.set(tx.date, (map.get(tx.date) ?? 0) + parseFloat(tx.amount));
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));
}

/** Computes MoM deltas between current and previous month category totals. */
export function computeMoMDeltas(
  current: CategoryTotal[],
  prev: CategoryTotal[]
): Map<number, MoMDelta> {
  const prevMap = new Map(prev.map((c) => [c.id, c]));
  const result = new Map<number, MoMDelta>();
  for (const cat of current) {
    const p = prevMap.get(cat.id);
    const prevSpend = p?.spend ?? 0;
    const pct =
      prevSpend === 0 ? null : ((cat.spend - prevSpend) / prevSpend) * 100;
    result.set(cat.id, {
      categoryId: cat.id,
      currentSpend: cat.spend,
      prevSpend,
      pct,
    });
  }
  return result;
}

/** Counts uncategorized expense transactions. */
export function countUncategorized(
  transactions: Transaction[],
  catMap: Map<number, CategoryInfo>
): number {
  return filterExpenses(transactions).filter(
    (tx) => tx.category_id == null || !catMap.has(tx.category_id)
  ).length;
}

/**
 * Averages total expense spend across multiple months of transactions.
 * Pass one Transaction[] per month. Returns 0 if no months provided.
 */
export function computeAverageMonthlySpend(
  monthlyTxArrays: Transaction[][],
  catMap: Map<number, CategoryInfo>
): number {
  if (monthlyTxArrays.length === 0) {
    return 0;
  }

  const totals = monthlyTxArrays.map((txs) =>
    filterSpendTransactions(txs, catMap).reduce(
      (sum, tx) => sum + parseFloat(tx.amount),
      0
    )
  );
  return totals.reduce((a, b) => a + b, 0) / totals.length;
}

// Returns transactions belonging to a given category id (-1 = uncategorized)
// Will sort the transactions by amount (highest first) and return top 5
export function getTransactionsForCategory(
  transactions: Transaction[],
  categoryId: number
): Transaction[] {
  return filterExpenses(transactions)
    .filter((tx) =>
      categoryId === -1 ? tx.category_id == null : tx.category_id === categoryId
    )
    .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
    .slice(0, 5);
}