import { describe, expect, it } from "vitest";
import { cn } from "../utils";

describe("cn design-system overrides", () => {
  it("lets callers replace a control's transition while retaining its duration", () => {
    expect(cn("transition-field duration-200", "transition-control")).toBe(
      "duration-200 transition-control"
    );
    expect(cn("transition-field", "transition-none")).toBe("transition-none");
  });

  it("merges responsive grid overrides without removing other breakpoints", () => {
    expect(
      cn("grid-cols-transaction sm:grid-cols-transaction-sm", "sm:grid-cols-2")
    ).toBe("grid-cols-transaction sm:grid-cols-2");
    expect(cn("grid-cols-2", "grid-cols-settings")).toBe("grid-cols-settings");
  });

  it.each([
    ["rounded-inherit", "rounded-lg"],
    ["max-w-viewport-inset", "max-w-sm"],
    ["min-h-app-content", "min-h-screen"],
    ["ease-expand", "ease-linear"],
    ["tracking-eyebrow", "tracking-wide"],
    ["category-chip-outline", "shadow-none"],
  ])("lets %s be overridden by %s", (base, override) => {
    expect(cn(base, override)).toBe(override);
  });
});
