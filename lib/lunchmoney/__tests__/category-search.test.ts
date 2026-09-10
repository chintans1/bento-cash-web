import { describe, expect, it } from "vitest";
import { rankCategoryMatches } from "../category-search";

const categories = [
  { name: "Transferred to Parents", group: "Transfers" },
  { name: "Credit Card Payment", group: "Transfers" },
  { name: "Transfer Between Banks", group: "Transfers" },
  { name: "Bank Transfer Fee", group: "Fees" },
  { name: "Groceries", group: "Everyday" },
];

describe("category search ranking", () => {
  it("ranks exact words, broader name matches, then group matches", () => {
    expect(
      rankCategoryMatches(categories, "transfer").map(({ name }) => name)
    ).toEqual([
      "Transfer Between Banks",
      "Bank Transfer Fee",
      "Transferred to Parents",
      "Credit Card Payment",
    ]);
  });

  it("preserves the original order when matches have equal relevance", () => {
    expect(
      rankCategoryMatches(categories, "transfers").map(({ name }) => name)
    ).toEqual([
      "Transferred to Parents",
      "Credit Card Payment",
      "Transfer Between Banks",
    ]);
  });

  it("returns every category for an empty query", () => {
    expect(rankCategoryMatches(categories, "   ")).toBe(categories);
  });
});
