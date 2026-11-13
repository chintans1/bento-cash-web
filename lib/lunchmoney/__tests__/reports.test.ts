import { describe, expect, it } from "vitest";
import type { Transaction } from "../client";
import type { CategoryInfo } from "../categories";
import { buildReportData, describeMonthlyChange } from "../reports";
import {
  compareBudget,
  compareIncome,
  compareSpending,
  spendingPace,
} from "../report-comparisons";

function transaction(
  toBase: number,
  overrides: Partial<Transaction> = {}
): Transaction {
  return {
    id: 1,
    date: "2026-01-15",
    currency: "usd",
    to_base: toBase,
    amount: String(toBase),
    recurring_id: null,
    payee: "Grocer",
    original_name: null,
    category_id: 1,
    plaid_account_id: null,
    manual_account_id: null,
    external_id: null,
    tag_ids: [],
    notes: null,
    status: "reviewed",
    is_pending: false,
    created_at: "2026-01-15T12:00:00Z",
    updated_at: "2026-01-15T12:00:00Z",
    split_parent_id: null,
    is_group_parent: false,
    group_parent_id: null,
    source: "manual",
    ...overrides,
  };
}

const categories = new Map<number, CategoryInfo>([
  [1, { name: "Food", is_income: false, exclude_from_totals: false }],
  [2, { name: "Salary", is_income: true, exclude_from_totals: false }],
  [3, { name: "Transfer", is_income: false, exclude_from_totals: true }],
]);

const periods = [
  { year: 2026, month: 1 },
  { year: 2026, month: 2 },
];

describe("report comparisons", () => {
  it("keeps merchants from both periods and reconciles reportable spending", () => {
    const rows = compareSpending(
      [
        transaction(125, { payee: "Market", date: "2026-02-02" }),
        transaction(25, { payee: " market ", date: "2026-02-03" }),
        transaction(70, { is_split_parent: true }),
        transaction(30, { status: "delete_pending" }),
        transaction(30, { group_parent_id: 11 }),
        transaction(30, { is_pending: true }),
        transaction(30, { category_id: 3 }),
      ],
      [
        transaction(100, { payee: "Market" }),
        transaction(75, { payee: "Books" }),
      ],
      categories,
      "merchant"
    );
    expect(rows).toEqual([
      expect.objectContaining({
        name: "Market",
        amount: 150,
        previous: 100,
        months: new Map([
          ["2026-02", 150],
          ["2026-01", 100],
        ]),
      }),
      expect.objectContaining({
        name: "Books",
        amount: 0,
        previous: 75,
        months: new Map([["2026-01", 75]]),
      }),
    ]);
    expect(
      compareIncome(
        [
          transaction(-100, { payee: "Employer" }),
          transaction(-200, { payee: "employer" }),
        ],
        [transaction(-250, { payee: "Employer" })],
        categories
      )[0]
    ).toMatchObject({ amount: 300, previous: 250, payments: 2 });
  });

  it("uses the same-day comparison and only projects the days remaining", () => {
    const pace = spendingPace(
      [
        transaction(75, { date: "2026-03-05" }),
        transaction(500, { date: "2026-03-20" }),
      ],
      [
        { period: periods[0], transactions: [] },
        {
          period: periods[1],
          transactions: [
            transaction(100, { date: "2026-02-05" }),
            transaction(200, { date: "2026-02-20" }),
          ],
        },
      ],
      new Date(2026, 2, 10),
      categories
    );
    expect(pace).toMatchObject({
      current: 75,
      typical: 100,
      projected: 275,
      baselineCount: 1,
    });
    expect(pace.days).toHaveLength(10);
    expect(pace.drivers[0]).toMatchObject({
      name: "Food",
      amount: 75,
      previous: 100,
    });
  });

  it("adds recurring actuals to other budget activity", () => {
    const totals = {
      budgeted: 100,
      other_activity: 80,
      recurring_activity: 45,
      recurring_expected: 60,
      recurring_remaining: 15,
    };
    expect(
      compareBudget(
        {
          aligned: true,
          categories: [
            { category_id: 1, totals },
            { category_id: 2, totals },
            { category_id: 3, totals },
          ],
        },
        categories
      )
    ).toMatchObject({ planned: 100, spent: 125, over: 1 });
  });

  it("counts a budgeted parent and its children only once", () => {
    const totals = {
      budgeted: 100,
      other_activity: 80,
      recurring_activity: 0,
      recurring_expected: 0,
      recurring_remaining: 0,
    };
    const map = new Map(categories);
    map.set(10, {
      name: "Household",
      is_income: false,
      exclude_from_totals: false,
    });
    expect(
      compareBudget(
        {
          aligned: true,
          categories: [
            { category_id: 10, totals },
            { category_id: 1, totals },
          ],
        },
        map,
        [
          {
            groupId: 10,
            groupName: "Household",
            items: [{ id: 1, name: "Food" }],
          },
        ]
      )
    ).toMatchObject({
      planned: 100,
      spent: 80,
      rows: [{ id: 10, group: true }],
    });
  });
});

describe("buildReportData", () => {
  it("computes monthly cash flow and period averages", () => {
    const report = buildReportData(
      [
        [
          transaction(-4_000, { category_id: 2, payee: "Employer" }),
          transaction(1_000),
        ],
        [
          transaction(-5_000, { category_id: 2, payee: "Employer" }),
          transaction(2_000),
        ],
      ],
      periods,
      categories
    );

    expect(report.months[0]).toMatchObject({
      key: "2026-01",
      income: 4_000,
      spend: 1_000,
      saved: 3_000,
      savingsRate: 75,
    });
    expect(report.averageIncome).toBe(4_500);
    expect(report.averageSpend).toBe(1_500);
    expect(report.averageSaved).toBe(3_000);
    expect(report.savingsRate).toBeCloseTo(66.67, 1);
    expect(report.lowestIncome).toBe(4_000);
    expect(report.latestSpendChange).toBe(100);
  });

  it("excludes pending and transfer transactions from every report", () => {
    const report = buildReportData(
      [
        [
          transaction(-4_000, { category_id: 2, payee: "Employer" }),
          transaction(500, { is_pending: true }),
          transaction(2_000, { category_id: 3 }),
        ],
      ],
      periods.slice(0, 1),
      categories
    );

    expect(report.averageIncome).toBe(4_000);
    expect(report.averageSpend).toBe(0);
    expect(report.spendingCategories).toEqual([]);
  });

  it("shows category share and latest month change", () => {
    const report = buildReportData(
      [
        [transaction(100), transaction(300, { category_id: null })],
        [transaction(150), transaction(450, { category_id: null })],
      ],
      periods,
      categories
    );

    expect(report.spendingCategories[0]).toMatchObject({
      name: "Uncategorized",
      total: 750,
      share: 75,
      latest: 450,
      change: 50,
    });
    expect(report.spendingCategories[1]).toMatchObject({
      name: "Food",
      total: 250,
      share: 25,
      latest: 150,
      change: 50,
    });
  });

  it("ranks income sources and reports payment consistency", () => {
    const report = buildReportData(
      [
        [
          transaction(-4_000, { category_id: 2, payee: "Employer" }),
          transaction(-250, { category_id: 2, payee: "Side project" }),
        ],
        [transaction(-4_200, { category_id: 2, payee: "Employer" })],
      ],
      periods,
      categories
    );

    expect(report.incomeSources[0]).toMatchObject({
      name: "Employer",
      total: 8_200,
      activeMonths: 2,
      averagePayment: 4_100,
    });
    expect(report.incomeSources[1]).toMatchObject({
      name: "Side project",
      total: 250,
      activeMonths: 1,
      averagePayment: 250,
    });
  });

  it("counts a zero-income month as the lowest month", () => {
    const report = buildReportData(
      [
        [transaction(-4_000, { category_id: 2, payee: "Employer" })],
        [transaction(100)],
      ],
      periods,
      categories
    );

    expect(report.lowestIncome).toBe(0);
  });

  it("describes unchanged monthly spending without implying a decrease", () => {
    const report = buildReportData(
      [[transaction(100)], [transaction(100)]],
      periods,
      categories
    );

    expect(report.latestSpendChange).toBe(0);
    expect(describeMonthlyChange(report.latestSpendChange)).toBe(
      "Same as the month before"
    );
  });
});
