import { describe, expect, it } from "vitest";
import { categoryColor } from "../category-colors";

describe("categoryColor", () => {
  it("uses the warning accent for uncategorized transactions", () => {
    expect(categoryColor("Uncategorized")).toBe("var(--cat-3)");
  });

  it("keeps hashing categorized names", () => {
    expect(categoryColor("Food & Dining")).toMatch(/^var\(--cat-[1-7]\)$/);
  });
});
