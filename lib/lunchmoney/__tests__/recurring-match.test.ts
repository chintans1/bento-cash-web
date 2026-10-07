import { describe, expect, it } from "vitest";
import { confirmedRecurringId, recurringMatch } from "../recurring-match";

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
