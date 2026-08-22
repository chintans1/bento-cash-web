import { prevMonthOf } from "../date-utils";
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
  amount: number; // non-recurring spend
  recurring: number; // recurring spend (recurring_id != null)
};

export type MoMDelta = {
  categoryId: number;
  currentSpend: number;
  prevSpend: number;
  /** percentage change; null when no prev spend to compare against */
  pct: number | null;
};

/** Flattens CategoriesResponse into a Map<id, CategoryInfo>, including children of group categories. */
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

/** Filters to non-pending expense transactions: amount > 0 and not is_pending. */
export function filterExpenses(transactions: Transaction[]): Transaction[] {
  return transactions.filter(
    (tx) => parseFloat(tx.amount) > 0 && !tx.is_pending
  );
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

/** Groups filtered spend transactions by category, sorted by spend descending; up to limit entries. Uncategorized transactions use id -1. */
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

/** Returns per-day spend for every day in the given year/month. Days with no transactions have amount 0.
 * Recurring transactions (recurring_id != null) are tracked separately so the chart can render them
 * as a distinct segment, and the peak day stat excludes them to avoid rent/subscription distortion. */
export function computeDailySpend(
  transactions: Transaction[],
  catMap: Map<number, CategoryInfo>,
  year: number,
  month: number
): DailySpend[] {
  const map = new Map<string, { amount: number; recurring: number }>();
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    map.set(key, { amount: 0, recurring: 0 });
  }
  for (const tx of filterSpendTransactions(transactions, catMap)) {
    const prev = map.get(tx.date) ?? { amount: 0, recurring: 0 };
    const amt = parseFloat(tx.amount);
    if (tx.recurring_id != null) {
      map.set(tx.date, { ...prev, recurring: prev.recurring + amt });
    } else {
      map.set(tx.date, { ...prev, amount: prev.amount + amt });
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { amount, recurring }]) => ({ date, amount, recurring }));
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

/** Counts uncategorized transactions (matches the ?category=-1 filter on the transactions page). */
export function countUncategorized(transactions: Transaction[]): number {
  return transactions.filter((tx) => !tx.is_pending && tx.category_id == null)
    .length;
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

/** Mirrors computeAverageMonthlySpend but sums income (negative-amount) transactions. */
export function computeAverageMonthlyIncome(
  monthlyTxArrays: Transaction[][],
  catMap: Map<number, CategoryInfo>
): number {
  if (monthlyTxArrays.length === 0) return 0;
  const totals = monthlyTxArrays.map((txs) =>
    filterIncomeTxs(txs, catMap).reduce(
      (sum, tx) => sum + Math.abs(parseFloat(tx.amount)),
      0
    )
  );
  return totals.reduce((a, b) => a + b, 0) / totals.length;
}

/**
 * Estimates monthly investable surplus from N months of transaction history.
 * Returns the average of (income − spend) per month across the window, floored at 0.
 * monthlyHistories must be ordered oldest-to-newest; windowMonths slices from the end.
 */
export function estimateMonthlyContrib(
  monthlyHistories: Transaction[][],
  catMap: Map<number, CategoryInfo>,
  windowMonths: number
): number {
  const slice = monthlyHistories.slice(-windowMonths);
  if (slice.length === 0) return 0;
  const surpluses = slice.map((txs) => {
    const income = filterIncomeTxs(txs, catMap).reduce(
      (sum, tx) => sum + Math.abs(parseFloat(tx.amount)),
      0
    );
    const spend = filterSpendTransactions(txs, catMap).reduce(
      (sum, tx) => sum + parseFloat(tx.amount),
      0
    );
    return Math.max(0, income - spend);
  });
  return surpluses.reduce((a, b) => a + b, 0) / surpluses.length;
}

/** Given a category id (-1 for uncategorized), returns up to 5 expense transactions sorted by amount descending. */
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

// ── Dashboard quick stats ─────────────────────────────────────────────────────

export type QuickStats = {
  totalSpend: number;
  totalIncome: number;
  avgSpendPerDay: number;
  peakDay: string;
  peakAmount: number;
};

/**
 * Filters to income transactions: negative amount, not pending, and not in an
 * exclude_from_totals category. Mirrors filterSpendTransactions for consistency.
 */
export function filterIncomeTxs(
  transactions: Transaction[],
  catMap: Map<number, CategoryInfo>
): Transaction[] {
  return transactions.filter((tx) => {
    if (parseFloat(tx.amount) >= 0 || tx.is_pending) return false;
    if (tx.category_id != null) {
      const cat = catMap.get(tx.category_id);
      if (cat?.exclude_from_totals) return false;
    }
    return true;
  });
}

/** Income transactions sorted by amount ascending (largest credit first). */
export function getSortedIncomeTxs(
  transactions: Transaction[],
  catMap: Map<number, CategoryInfo>
): Transaction[] {
  return filterIncomeTxs(transactions, catMap).sort(
    (a, b) => parseFloat(a.amount) - parseFloat(b.amount)
  );
}

/** Spend transactions sorted by amount descending (largest spend first). */
export function getSortedSpendTxs(
  transactions: Transaction[],
  catMap: Map<number, CategoryInfo>
): Transaction[] {
  return filterSpendTransactions(transactions, catMap).sort(
    (a, b) => parseFloat(b.amount) - parseFloat(a.amount)
  );
}

/** Filters sortedSpendTxs to only those on the given date. */
export function getPeakDayTxs(
  sortedSpendTxs: Transaction[],
  peakDay: string
): Transaction[] {
  return sortedSpendTxs.filter((tx) => tx.date === peakDay);
}

/**
 * Computes the four quick-stat values for the dashboard.
 * today is a parameter so this function is testable with a fixed date.
 * Returns null when there are no transactions.
 */
export function computeQuickStats(
  transactions: Transaction[],
  catMap: Map<number, CategoryInfo>,
  year: number,
  month: number,
  dailySpend: DailySpend[],
  today: Date
): QuickStats | null {
  if (transactions.length === 0) return null;

  const totalSpend = filterSpendTransactions(transactions, catMap).reduce(
    (sum, tx) => sum + parseFloat(tx.amount),
    0
  );
  const totalIncome = filterIncomeTxs(transactions, catMap).reduce(
    (sum, tx) => sum + Math.abs(parseFloat(tx.amount)),
    0
  );

  const daysInMonth = new Date(year, month, 0).getDate();
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;
  const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth;
  const avgSpendPerDay = daysElapsed > 0 ? totalSpend / daysElapsed : 0;

  // Peak day is based on non-recurring spend only (d.amount) to avoid rent/subscription distortion
  const peak = dailySpend.reduce(
    (max, d) => (d.amount > max.amount ? d : max),
    { date: "", amount: 0, recurring: 0 }
  );

  return {
    totalSpend,
    totalIncome,
    avgSpendPerDay,
    peakDay: peak.date,
    peakAmount: peak.amount,
  };
}

// ── Trend series ─────────────────────────────────────────────────────────────

export type NetFlowPoint = {
  date: string; // YYYY-MM-DD
  /** Running income − spend from the first of the month through this day. */
  net: number;
};

/**
 * Running net cash flow (income − spend) for every day of the given month.
 *
 * The dashboard's net worth chart anchors this series to today's account
 * balances: net worth on day N = net worth today − (net at end of series − net
 * on day N). Transfers are excluded (they carry exclude_from_totals), so money
 * moving between the user's own accounts doesn't show up as a swing.
 */
export function computeNetFlowSeries(
  transactions: Transaction[],
  catMap: Map<number, CategoryInfo>,
  year: number,
  month: number
): NetFlowPoint[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const perDay = new Map<string, number>();

  for (const tx of filterSpendTransactions(transactions, catMap)) {
    perDay.set(tx.date, (perDay.get(tx.date) ?? 0) - parseFloat(tx.amount));
  }
  for (const tx of filterIncomeTxs(transactions, catMap)) {
    perDay.set(
      tx.date,
      (perDay.get(tx.date) ?? 0) + Math.abs(parseFloat(tx.amount))
    );
  }

  const series: NetFlowPoint[] = [];
  let running = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    running += perDay.get(date) ?? 0;
    series.push({ date, net: running });
  }
  return series;
}

export type CumulativeSpendPoint = {
  day: number;
  /** Cumulative spend in the selected month; null for days that haven't happened yet. */
  current: number | null;
  /** Cumulative spend in the previous month up to the same day number. */
  previous: number | null;
};

/**
 * Day-by-day cumulative spend for the selected month against the previous one,
 * so the two months can be drawn on the same axis. The current line stops at
 * today when the selected month is the current month — carrying a flat line to
 * the end of the month would read as "spending stopped".
 */
export function computeCumulativeSpendComparison(
  transactions: Transaction[],
  prevTransactions: Transaction[],
  catMap: Map<number, CategoryInfo>,
  year: number,
  month: number,
  today: Date
): CumulativeSpendPoint[] {
  const prev = prevMonthOf(year, month);
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPrevMonth = new Date(prev.year, prev.month, 0).getDate();

  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;
  const lastDayWithData = isCurrentMonth ? today.getDate() : daysInMonth;

  const dayTotals = (txs: Transaction[]) => {
    const totals = new Map<number, number>();
    for (const tx of filterSpendTransactions(txs, catMap)) {
      const day = parseInt(tx.date.slice(8, 10), 10);
      totals.set(day, (totals.get(day) ?? 0) + parseFloat(tx.amount));
    }
    return totals;
  };

  const currentTotals = dayTotals(transactions);
  const prevTotals = dayTotals(prevTransactions);

  const points: CumulativeSpendPoint[] = [];
  let currentRunning = 0;
  let prevRunning = 0;
  for (let day = 1; day <= Math.max(daysInMonth, daysInPrevMonth); day++) {
    currentRunning += currentTotals.get(day) ?? 0;
    prevRunning += prevTotals.get(day) ?? 0;
    points.push({
      day,
      current:
        day <= Math.min(lastDayWithData, daysInMonth) ? currentRunning : null,
      previous: day <= daysInPrevMonth ? prevRunning : null,
    });
  }
  return points;
}

/** Most recent non-pending transactions, newest first. */
export function getRecentTransactions(
  transactions: Transaction[],
  limit = 6
): Transaction[] {
  return transactions
    .filter((tx) => !tx.is_pending)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

export type MonthTotals = { income: number; spend: number };

/** Income and spend totals for a month's transactions, both as positive numbers. */
export function computeMonthTotals(
  transactions: Transaction[],
  catMap: Map<number, CategoryInfo>
): MonthTotals {
  const income = filterIncomeTxs(transactions, catMap).reduce(
    (sum, tx) => sum + Math.abs(parseFloat(tx.amount)),
    0
  );
  const spend = filterSpendTransactions(transactions, catMap).reduce(
    (sum, tx) => sum + parseFloat(tx.amount),
    0
  );
  return { income, spend };
}
