import { describe, expect, it } from "vitest";
import { categoryColor } from "../category-colors";

describe("categoryColor", () => {
  it("uses the red accent for uncategorized transactions", () => {
    expect(categoryColor("Uncategorized")).toBe("var(--cat-1)");
  });

  it("keeps hashing categorized names", () => {
    expect(categoryColor("Food & Dining")).toMatch(/^var\(--cat-[1-7]\)$/);
  });
});
