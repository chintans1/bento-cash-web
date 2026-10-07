import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AlignedSummaryResponse } from "@/lib/lunchmoney/client";
import type { CategoryInfo } from "@/lib/lunchmoney/categories";
import { BudgetProgressCard } from "./budget-progress-card";

const categoryInfo = (name: string): CategoryInfo => ({
  name,
  is_income: false,
  exclude_from_totals: false,
});

describe("BudgetProgressCard", () => {
  it("shows budget categories in configured order instead of percent spent", () => {
    const categoryMap = new Map<number, CategoryInfo>([
      [2, categoryInfo("Rent")],
      [1, categoryInfo("Groceries")],
      [3, categoryInfo("Travel")],
    ]);
    const summary: AlignedSummaryResponse = {
      aligned: true,
      categories: [
        {
          category_id: 3,
          totals: {
            budgeted: 100,
            other_activity: 90,
            recurring_activity: 0,
            recurring_expected: 0,
            recurring_remaining: 0,
          },
        },
        {
          category_id: 1,
          totals: {
            budgeted: 100,
            other_activity: 50,
            recurring_activity: 0,
            recurring_expected: 0,
            recurring_remaining: 0,
          },
        },
        {
          category_id: 2,
          totals: {
            budgeted: 100,
            other_activity: 10,
            recurring_activity: 0,
            recurring_expected: 0,
            recurring_remaining: 0,
          },
        },
      ],
    };

    const html = renderToStaticMarkup(
      <BudgetProgressCard
        summary={summary}
        categoryMap={categoryMap}
        primaryCurrency="usd"
      />
    );
    expect(html.indexOf("Rent")).toBeLessThan(html.indexOf("Groceries"));
    expect(html.indexOf("Groceries")).toBeLessThan(html.indexOf("Travel"));
  });
});
