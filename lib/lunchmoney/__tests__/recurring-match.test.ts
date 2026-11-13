import { describe, expect, it } from "vitest";
import {
  confirmedRecurringId,
  expectedRecurringDate,
  postedRecurringIds,
  recurringMatch,
} from "../recurring-match";

const recurringItems = [
  { id: 1, status: "reviewed" as const },
  { id: 2, status: "suggested" as const },
];

describe("recurringMatch", () => {
  it("only confirms a link to a reviewed recurring item", () => {
    expect(recurringMatch(1, recurringItems)).toBe("confirmed");
    expect(recurringMatch(2, recurringItems)).toBe("possible");
    expect(recurringMatch(3, recurringItems)).toBeNull();
    expect(recurringMatch(null, recurringItems)).toBeNull();
  });

  it("leaves suggested items unassigned in recurring selectors", () => {
    expect(confirmedRecurringId(1, recurringItems)).toBe(1);
    expect(confirmedRecurringId(2, recurringItems)).toBeNull();
    expect(confirmedRecurringId(3, recurringItems)).toBeNull();
  });
});

it("chooses the closest occurrence in the edited month", () => {
  const dates = ["2026-10-30", "2026-11-20", "2026-11-06", "2026-12-04"];
  expect(expectedRecurringDate(dates, "2026-11-18")).toBe("2026-11-20");
  expect(expectedRecurringDate(dates, "2026-11-13")).toBe("2026-11-06");
  expect(expectedRecurringDate(dates, "2027-01-03")).toBeNull();
});

it("uses only other posted matches when ordering recurring items", () => {
  const posted = { is_pending: false, status: "reviewed" as const };
  const ids = postedRecurringIds(
    [
      { ...posted, id: 10, recurring_id: 1 },
      { ...posted, id: 11, recurring_id: 1 },
      { ...posted, id: 12, recurring_id: 2 },
      { ...posted, id: 13, recurring_id: 3, is_pending: true },
      { ...posted, id: 14, recurring_id: 4, status: "delete_pending" },
      { ...posted, id: 15, recurring_id: null },
    ],
    12
  );
  expect([...ids]).toEqual([1]);
});
