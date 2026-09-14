import { describe, expect, it } from "vitest";
import type { Transaction } from "../client";
import type { CategoryInfo } from "../categories";
import { buildReportData } from "../reports";

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
});
