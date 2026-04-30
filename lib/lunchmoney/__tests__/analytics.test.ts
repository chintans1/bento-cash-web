import { describe, it, expect } from "vitest";
import type { Transaction, Category, CategoriesResponse } from "../client";
import {
  buildCategoryMap,
  buildCategoryData,
  filterExpenses,
  filterSpendTransactions,
  filterIncomeTxs,
  getSortedIncomeTxs,
  getSortedSpendTxs,
  getPeakDayTxs,
  computeQuickStats,
  computeCategoryTotals,
  computeMerchantTotals,
  computeDailySpend,
  computeMoMDeltas,
  countUncategorized,
  computeAverageMonthlySpend,
  getTransactionsForCategory,
} from "../analytics";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeTx(
  overrides: { amount: string } & Record<string, unknown>
): Transaction {
  return {
    id: 1,
    date: "2026-01-15",
    currency: "usd",
    to_base: parseFloat(overrides.amount),
    recurring_id: null,
    payee: "Test Payee",
    category_id: null,
    plaid_account_id: null,
    manual_account_id: null,
    external_id: null,
    tag_ids: [],
    notes: null,
    status: "reviewed",
    is_pending: false,
    created_at: "2026-01-15T12:00:00Z",
    updated_at: "2026-01-15T12:00:00Z",
    ...overrides,
  } as unknown as Transaction;
}

const CAT_DEFAULTS = {
  description: null,
  is_income: false,
  exclude_from_budget: false,
  exclude_from_totals: false,
  updated_at: "2026-01-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
  group_id: null,
  is_group: false,
  archived: false,
  archived_at: null,
  order: null,
  collapsed: false,
};

function makeCat(
  overrides: { id: number; name: string } & Partial<Category>
): Category {
  return { ...CAT_DEFAULTS, ...overrides } as Category;
}

function makeChildCat(
  id: number,
  name: string,
  groupId: number,
  overrides: Record<string, unknown> = {}
) {
  return {
    id,
    name,
    description: null,
    is_income: false,
    exclude_from_budget: false,
    exclude_from_totals: false,
    updated_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    group_id: groupId,
    is_group: false as const,
    archived: false,
    archived_at: null,
    order: null,
    collapsed: false,
    ...overrides,
  };
}

// ── buildCategoryMap ──────────────────────────────────────────────────────────

describe("buildCategoryMap", () => {
  it("includes parent and all children in the map", () => {
    const food = makeCat({
      id: 1,
      name: "Food",
      is_group: true,
      children: [
        makeChildCat(10, "Groceries", 1),
        makeChildCat(11, "Restaurants", 1),
      ],
    });
    const map = buildCategoryMap({ categories: [food] });
    expect(map.size).toBe(3);
    expect(map.get(1)?.name).toBe("Food");
    expect(map.get(10)?.name).toBe("Groceries");
    expect(map.get(11)?.name).toBe("Restaurants");
  });

  it("includes a standalone category with no children", () => {
    const map = buildCategoryMap({
      categories: [makeCat({ id: 5, name: "Travel" })],
    });
    expect(map.size).toBe(1);
    expect(map.get(5)?.name).toBe("Travel");
  });

  it("returns an empty map for empty categories", () => {
    expect(buildCategoryMap({ categories: [] }).size).toBe(0);
  });

  it("stores exclude_from_totals from children", () => {
    const transfers = makeCat({
      id: 2,
      name: "Transfers",
      is_group: true,
      children: [
        makeChildCat(20, "Transfer Out", 2, { exclude_from_totals: true }),
      ],
    });
    const map = buildCategoryMap({ categories: [transfers] });
    expect(map.get(20)?.exclude_from_totals).toBe(true);
  });
});

// ── buildCategoryData ─────────────────────────────────────────────────────────

describe("buildCategoryData", () => {
  it("puts group categories before standalone", () => {
    const res: CategoriesResponse = {
      categories: [
        makeCat({ id: 1, name: "Solo" }),
        makeCat({
          id: 2,
          name: "Group",
          is_group: true,
          children: [makeChildCat(20, "Child", 2)],
        }),
      ],
    };
    const { catGroups } = buildCategoryData(res);
    expect(catGroups[0].groupId).toBe(2);
    expect(catGroups[1].groupId).toBeNull();
  });

  it("collapses standalones into a single null-groupId entry", () => {
    const res: CategoriesResponse = {
      categories: [
        makeCat({ id: 1, name: "Travel" }),
        makeCat({ id: 2, name: "Health" }),
      ],
    };
    const { catGroups } = buildCategoryData(res);
    expect(catGroups).toHaveLength(1);
    expect(catGroups[0].groupId).toBeNull();
    expect(catGroups[0].items).toHaveLength(2);
  });

  it("builds the categoryMap in the same pass", () => {
    const res: CategoriesResponse = {
      categories: [makeCat({ id: 7, name: "Shopping" })],
    };
    const { categoryMap } = buildCategoryData(res);
    expect(categoryMap.get(7)?.name).toBe("Shopping");
  });
});

// ── filterExpenses ────────────────────────────────────────────────────────────

describe("filterExpenses", () => {
  it("includes positive non-pending transactions", () => {
    const tx = makeTx({ amount: "50.00" });
    expect(filterExpenses([tx])).toHaveLength(1);
  });

  it("excludes pending transactions", () => {
    const tx = makeTx({ amount: "50.00", is_pending: true });
    expect(filterExpenses([tx])).toHaveLength(0);
  });

  it("excludes negative amounts (income/credits)", () => {
    const tx = makeTx({ amount: "-50.00" });
    expect(filterExpenses([tx])).toHaveLength(0);
  });

  it("excludes zero-amount transactions", () => {
    const tx = makeTx({ amount: "0.00" });
    expect(filterExpenses([tx])).toHaveLength(0);
  });
});

// ── filterSpendTransactions ───────────────────────────────────────────────────

describe("filterSpendTransactions", () => {
  const catMap = new Map([
    [1, { name: "Food", is_income: false, exclude_from_totals: false }],
    [2, { name: "Transfers", is_income: false, exclude_from_totals: true }],
  ]);

  it("includes transactions with null category_id (uncategorized)", () => {
    const tx = makeTx({ amount: "30.00", category_id: null });
    expect(filterSpendTransactions([tx], catMap)).toHaveLength(1);
  });

  it("includes transactions in a normal category", () => {
    const tx = makeTx({ amount: "30.00", category_id: 1 });
    expect(filterSpendTransactions([tx], catMap)).toHaveLength(1);
  });

  it("excludes transactions in an exclude_from_totals category", () => {
    const tx = makeTx({ amount: "30.00", category_id: 2 });
    expect(filterSpendTransactions([tx], catMap)).toHaveLength(0);
  });

  it("excludes negative amounts", () => {
    const tx = makeTx({ amount: "-50.00", category_id: 1 });
    expect(filterSpendTransactions([tx], catMap)).toHaveLength(0);
  });
});

// ── computeCategoryTotals ─────────────────────────────────────────────────────

describe("computeCategoryTotals", () => {
  const catMap = new Map([
    [1, { name: "Food", is_income: false, exclude_from_totals: false }],
    [2, { name: "Transport", is_income: false, exclude_from_totals: false }],
  ]);

  it("accumulates spend for the same category", () => {
    const txs = [
      makeTx({ amount: "20.00", category_id: 1 }),
      makeTx({ amount: "30.00", category_id: 1 }),
    ];
    const totals = computeCategoryTotals(txs, catMap);
    expect(totals[0].id).toBe(1);
    expect(totals[0].spend).toBeCloseTo(50);
    expect(totals[0].txCount).toBe(2);
  });

  it("sorts by spend descending", () => {
    const txs = [
      makeTx({ amount: "10.00", category_id: 1 }),
      makeTx({ amount: "50.00", category_id: 2 }),
    ];
    const totals = computeCategoryTotals(txs, catMap);
    expect(totals[0].id).toBe(2);
    expect(totals[1].id).toBe(1);
  });

  it("respects the limit parameter", () => {
    const txs = [
      makeTx({ amount: "10.00", category_id: 1 }),
      makeTx({ amount: "20.00", category_id: 2 }),
    ];
    expect(computeCategoryTotals(txs, catMap, 1)).toHaveLength(1);
  });

  it("groups uncategorized transactions under id -1", () => {
    const tx = makeTx({ amount: "15.00", category_id: null });
    const totals = computeCategoryTotals([tx], catMap);
    expect(totals[0].id).toBe(-1);
    expect(totals[0].name).toBe("Uncategorized");
  });
});

// ── computeMerchantTotals ─────────────────────────────────────────────────────

describe("computeMerchantTotals", () => {
  const catMap = new Map([
    [1, { name: "Food", is_income: false, exclude_from_totals: false }],
  ]);

  it("groups transactions by payee and sorts descending", () => {
    const txs = [
      makeTx({ amount: "10.00", payee: "Starbucks" }),
      makeTx({ amount: "40.00", payee: "Whole Foods" }),
      makeTx({ amount: "15.00", payee: "Starbucks" }),
    ];
    const totals = computeMerchantTotals(txs, catMap);
    expect(totals[0].payee).toBe("Whole Foods");
    expect(totals[1].payee).toBe("Starbucks");
    expect(totals[1].spend).toBeCloseTo(25);
    expect(totals[1].txCount).toBe(2);
  });

  it("trims whitespace from payee", () => {
    const tx = makeTx({ amount: "20.00", payee: "  Trader Joe's  " });
    const totals = computeMerchantTotals([tx], catMap);
    expect(totals[0].payee).toBe("Trader Joe's");
  });

  it("uses 'Unknown' for empty payee", () => {
    const tx = makeTx({ amount: "10.00", payee: "" });
    const totals = computeMerchantTotals([tx], catMap);
    expect(totals[0].payee).toBe("Unknown");
  });
});

// ── computeDailySpend ─────────────────────────────────────────────────────────

describe("computeDailySpend", () => {
  const catMap = new Map<
    number,
    { name: string; is_income: boolean; exclude_from_totals: boolean }
  >();

  it("returns an entry for every day in the month (zero-filled)", () => {
    const result = computeDailySpend([], catMap, 2026, 1);
    expect(result).toHaveLength(31); // January has 31 days
    expect(result.every((d) => d.amount === 0 && d.recurring === 0)).toBe(true);
  });

  it("accumulates non-recurring spend on the correct day", () => {
    const txs = [
      makeTx({ amount: "25.00", date: "2026-01-10" }),
      makeTx({ amount: "15.00", date: "2026-01-10" }),
    ];
    const result = computeDailySpend(txs, catMap, 2026, 1);
    const day10 = result.find((d) => d.date === "2026-01-10");
    expect(day10?.amount).toBeCloseTo(40);
    expect(day10?.recurring).toBeCloseTo(0);
  });

  it("splits recurring and non-recurring spend into separate fields", () => {
    const txs = [
      makeTx({ amount: "50.00", date: "2026-01-01" }),
      makeTx({ amount: "1500.00", date: "2026-01-01", recurring_id: 99 }),
    ];
    const result = computeDailySpend(txs, catMap, 2026, 1);
    const day1 = result.find((d) => d.date === "2026-01-01");
    expect(day1?.amount).toBeCloseTo(50);
    expect(day1?.recurring).toBeCloseTo(1500);
  });

  it("returns entries sorted by date ascending", () => {
    const result = computeDailySpend([], catMap, 2026, 1);
    expect(result[0].date).toBe("2026-01-01");
    expect(result[30].date).toBe("2026-01-31");
  });

  it("handles February correctly (28 days in non-leap year)", () => {
    const result = computeDailySpend([], catMap, 2026, 2);
    expect(result).toHaveLength(28);
    expect(result[27].date).toBe("2026-02-28");
  });
});

// ── computeMoMDeltas ──────────────────────────────────────────────────────────

describe("computeMoMDeltas", () => {
  it("computes percentage change correctly", () => {
    const current = [{ id: 1, name: "Food", spend: 150, txCount: 5 }];
    const prev = [{ id: 1, name: "Food", spend: 100, txCount: 4 }];
    const deltas = computeMoMDeltas(current, prev);
    expect(deltas.get(1)?.pct).toBeCloseTo(50);
  });

  it("returns null pct when no previous spend", () => {
    const current = [{ id: 1, name: "Food", spend: 100, txCount: 3 }];
    const deltas = computeMoMDeltas(current, []);
    expect(deltas.get(1)?.pct).toBeNull();
  });

  it("returns negative pct for a spend decrease", () => {
    const current = [{ id: 1, name: "Food", spend: 50, txCount: 2 }];
    const prev = [{ id: 1, name: "Food", spend: 100, txCount: 4 }];
    const deltas = computeMoMDeltas(current, prev);
    expect(deltas.get(1)?.pct).toBeCloseTo(-50);
  });

  it("includes correct currentSpend and prevSpend", () => {
    const current = [{ id: 1, name: "Food", spend: 200, txCount: 5 }];
    const prev = [{ id: 1, name: "Food", spend: 150, txCount: 4 }];
    const delta = computeMoMDeltas(current, prev).get(1)!;
    expect(delta.currentSpend).toBe(200);
    expect(delta.prevSpend).toBe(150);
  });
});

// ── countUncategorized ────────────────────────────────────────────────────────

describe("countUncategorized", () => {
  it("counts non-pending transactions with null category_id", () => {
    const txs = [
      makeTx({ amount: "10.00", category_id: null }),
      makeTx({ amount: "20.00", category_id: null }),
    ];
    expect(countUncategorized(txs)).toBe(2);
  });

  it("excludes pending transactions", () => {
    const tx = makeTx({ amount: "10.00", category_id: null, is_pending: true });
    expect(countUncategorized([tx])).toBe(0);
  });

  it("does not count transactions that have a category", () => {
    const tx = makeTx({ amount: "10.00", category_id: 1 });
    expect(countUncategorized([tx])).toBe(0);
  });
});

// ── computeAverageMonthlySpend ────────────────────────────────────────────────

describe("computeAverageMonthlySpend", () => {
  const catMap = new Map<
    number,
    { name: string; is_income: boolean; exclude_from_totals: boolean }
  >();

  it("returns 0 for empty input", () => {
    expect(computeAverageMonthlySpend([], catMap)).toBe(0);
  });

  it("returns the total for a single month", () => {
    const txs = [makeTx({ amount: "100.00" }), makeTx({ amount: "50.00" })];
    expect(computeAverageMonthlySpend([txs], catMap)).toBeCloseTo(150);
  });

  it("returns the mean across multiple months", () => {
    const jan = [makeTx({ amount: "100.00" })];
    const feb = [makeTx({ amount: "200.00" })];
    expect(computeAverageMonthlySpend([jan, feb], catMap)).toBeCloseTo(150);
  });
});

// ── getTransactionsForCategory ────────────────────────────────────────────────

describe("getTransactionsForCategory", () => {
  it("returns transactions for the given category sorted by amount descending", () => {
    const txs = [
      makeTx({ id: 1, amount: "10.00", category_id: 1 }),
      makeTx({ id: 2, amount: "50.00", category_id: 1 }),
      makeTx({ id: 3, amount: "30.00", category_id: 1 }),
    ];
    const result = getTransactionsForCategory(txs, 1);
    expect(result[0].id).toBe(2);
    expect(result[1].id).toBe(3);
    expect(result[2].id).toBe(1);
  });

  it("returns at most 5 transactions", () => {
    const txs = Array.from({ length: 8 }, (_, i) =>
      makeTx({ id: i, amount: "10.00", category_id: 1 })
    );
    expect(getTransactionsForCategory(txs, 1)).toHaveLength(5);
  });

  it("returns uncategorized transactions when categoryId is -1", () => {
    const txs = [
      makeTx({ id: 1, amount: "20.00", category_id: null }),
      makeTx({ id: 2, amount: "30.00", category_id: 5 }),
    ];
    const result = getTransactionsForCategory(txs, -1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("excludes pending and income transactions (via filterExpenses)", () => {
    const txs = [
      makeTx({ id: 1, amount: "20.00", category_id: 1, is_pending: true }),
      makeTx({ id: 2, amount: "-10.00", category_id: 1 }),
      makeTx({ id: 3, amount: "15.00", category_id: 1 }),
    ];
    const result = getTransactionsForCategory(txs, 1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });
});

// ── filterIncomeTxs ───────────────────────────────────────────────────────────

describe("filterIncomeTxs", () => {
  const catMap = new Map([
    [1, { name: "Salary", is_income: true, exclude_from_totals: false }],
    [2, { name: "Transfers", is_income: false, exclude_from_totals: true }],
  ]);

  it("includes negative non-pending transactions", () => {
    const tx = makeTx({ amount: "-500.00" });
    expect(filterIncomeTxs([tx], catMap)).toHaveLength(1);
  });

  it("excludes positive amounts (expenses)", () => {
    const tx = makeTx({ amount: "50.00" });
    expect(filterIncomeTxs([tx], catMap)).toHaveLength(0);
  });

  it("excludes pending transactions", () => {
    const tx = makeTx({ amount: "-500.00", is_pending: true });
    expect(filterIncomeTxs([tx], catMap)).toHaveLength(0);
  });

  it("excludes transactions in exclude_from_totals categories (e.g. transfers)", () => {
    const tx = makeTx({ amount: "-500.00", category_id: 2 });
    expect(filterIncomeTxs([tx], catMap)).toHaveLength(0);
  });

  it("includes transactions with null category_id", () => {
    const tx = makeTx({ amount: "-200.00", category_id: null });
    expect(filterIncomeTxs([tx], catMap)).toHaveLength(1);
  });

  it("includes income-category transactions", () => {
    const tx = makeTx({ amount: "-3000.00", category_id: 1 });
    expect(filterIncomeTxs([tx], catMap)).toHaveLength(1);
  });
});

// ── getSortedIncomeTxs ────────────────────────────────────────────────────────

describe("getSortedIncomeTxs", () => {
  const catMap = new Map<
    number,
    { name: string; is_income: boolean; exclude_from_totals: boolean }
  >();

  it("sorts by amount ascending (largest credit first)", () => {
    const txs = [
      makeTx({ id: 1, amount: "-100.00" }),
      makeTx({ id: 2, amount: "-3000.00" }),
      makeTx({ id: 3, amount: "-500.00" }),
    ];
    const result = getSortedIncomeTxs(txs, catMap);
    expect(result[0].id).toBe(2);
    expect(result[1].id).toBe(3);
    expect(result[2].id).toBe(1);
  });
});

// ── getSortedSpendTxs ─────────────────────────────────────────────────────────

describe("getSortedSpendTxs", () => {
  const catMap = new Map([
    [1, { name: "Food", is_income: false, exclude_from_totals: false }],
  ]);

  it("sorts by amount descending (largest spend first)", () => {
    const txs = [
      makeTx({ id: 1, amount: "10.00" }),
      makeTx({ id: 2, amount: "80.00" }),
      makeTx({ id: 3, amount: "40.00" }),
    ];
    const result = getSortedSpendTxs(txs, catMap);
    expect(result[0].id).toBe(2);
    expect(result[1].id).toBe(3);
    expect(result[2].id).toBe(1);
  });

  it("excludes income and exclude_from_totals transactions", () => {
    const transfers = new Map([
      [1, { name: "Transfers", is_income: false, exclude_from_totals: true }],
    ]);
    const txs = [
      makeTx({ amount: "-100.00" }),
      makeTx({ amount: "50.00", category_id: 1 }),
    ];
    expect(getSortedSpendTxs(txs, transfers)).toHaveLength(0);
  });
});

// ── getPeakDayTxs ─────────────────────────────────────────────────────────────

describe("getPeakDayTxs", () => {
  it("returns only transactions on the given date", () => {
    const txs = [
      makeTx({ id: 1, amount: "50.00", date: "2026-01-10" }),
      makeTx({ id: 2, amount: "30.00", date: "2026-01-11" }),
      makeTx({ id: 3, amount: "20.00", date: "2026-01-10" }),
    ];
    const result = getPeakDayTxs(txs, "2026-01-10");
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toContain(1);
    expect(result.map((t) => t.id)).toContain(3);
  });

  it("returns empty array when no transactions match the date", () => {
    const txs = [makeTx({ amount: "50.00", date: "2026-01-10" })];
    expect(getPeakDayTxs(txs, "2026-01-15")).toHaveLength(0);
  });
});

// ── computeQuickStats ─────────────────────────────────────────────────────────

describe("computeQuickStats", () => {
  const catMap = new Map([
    [1, { name: "Food", is_income: false, exclude_from_totals: false }],
    [2, { name: "Transfers", is_income: false, exclude_from_totals: true }],
  ]);

  const dailySpend = [
    { date: "2026-01-10", amount: 120, recurring: 0 },
    { date: "2026-01-15", amount: 300, recurring: 0 },
    { date: "2026-01-20", amount: 80, recurring: 0 },
  ];

  it("returns null when there are no transactions", () => {
    expect(computeQuickStats([], catMap, 2026, 1, [], new Date())).toBeNull();
  });

  it("computes totalSpend correctly", () => {
    const txs = [makeTx({ amount: "100.00" }), makeTx({ amount: "50.00" })];
    const result = computeQuickStats(txs, catMap, 2026, 1, [], new Date());
    expect(result?.totalSpend).toBeCloseTo(150);
  });

  it("excludes exclude_from_totals transactions from totalSpend", () => {
    const txs = [
      makeTx({ amount: "100.00" }),
      makeTx({ amount: "200.00", category_id: 2 }),
    ];
    const result = computeQuickStats(txs, catMap, 2026, 1, [], new Date());
    expect(result?.totalSpend).toBeCloseTo(100);
  });

  it("computes totalIncome and excludes transfers", () => {
    const txs = [
      makeTx({ amount: "-1000.00" }),
      makeTx({ amount: "-500.00", category_id: 2 }),
    ];
    const result = computeQuickStats(txs, catMap, 2026, 1, [], new Date());
    expect(result?.totalIncome).toBeCloseTo(1000);
  });

  it("uses full month days for avgSpendPerDay in a past month", () => {
    // January 2026 is in the past; today is April 2026
    const today = new Date(2026, 3, 15); // April 15, 2026
    const txs = [makeTx({ amount: "310.00" })]; // 310 / 31 days = 10/day
    const result = computeQuickStats(txs, catMap, 2026, 1, [], today);
    expect(result?.avgSpendPerDay).toBeCloseTo(10);
  });

  it("uses days elapsed for avgSpendPerDay in the current month", () => {
    const today = new Date(2026, 0, 10); // January 10, 2026
    const txs = [makeTx({ amount: "100.00" })]; // 100 / 10 days = 10/day
    const result = computeQuickStats(txs, catMap, 2026, 1, [], today);
    expect(result?.avgSpendPerDay).toBeCloseTo(10);
  });

  it("identifies the peak day and amount from dailySpend", () => {
    const txs = [makeTx({ amount: "10.00" })];
    const result = computeQuickStats(
      txs,
      catMap,
      2026,
      1,
      dailySpend,
      new Date()
    );
    expect(result?.peakDay).toBe("2026-01-15");
    expect(result?.peakAmount).toBe(300);
  });
});
