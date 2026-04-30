import { describe, it, expect } from "vitest";
import { formatAmount, formatCurrency, formatShortDate } from "../format";

// ── formatAmount ──────────────────────────────────────────────────────────────

describe("formatAmount", () => {
  it("formats as whole dollars by default", () => {
    expect(formatAmount(1000)).toBe("$1,000");
    expect(formatAmount(50)).toBe("$50");
  });

  it("formats with 2 decimal places when exact=true", () => {
    expect(formatAmount(1000, true)).toBe("$1,000.00");
    expect(formatAmount(0, true)).toBe("$0.00");
    expect(formatAmount(1.5, true)).toBe("$1.50");
  });

  it("formats with thousands separator", () => {
    expect(formatAmount(1234567)).toBe("$1,234,567");
  });
});

// ── formatCurrency ────────────────────────────────────────────────────────────

describe("formatCurrency", () => {
  it("formats a valid ISO currency code", () => {
    const result = formatCurrency(100, "USD");
    expect(result).toBe("$100");
  });

  it("accepts lowercase currency codes", () => {
    const result = formatCurrency(100, "usd");
    expect(result).toBe("$100");
  });

  it("shows 2 decimal places when exact=true", () => {
    expect(formatCurrency(100, "EUR", true)).toBe("€100.00");
  });

  it("falls back to '100 FAKE' format for unsupported currency codes", () => {
    const result = formatCurrency(100, "FAKE");
    expect(result).toBe("100 FAKE");
  });

  it("fallback respects exact flag", () => {
    expect(formatCurrency(100.5, "FAKE", true)).toBe("100.50 FAKE");
    expect(formatCurrency(100.5, "FAKE", false)).toBe("101 FAKE");
  });
});

// ── formatShortDate ───────────────────────────────────────────────────────────

describe("formatShortDate", () => {
  it("formats a date as 'Mon D'", () => {
    expect(formatShortDate("2026-01-01")).toBe("Jan 1");
    expect(formatShortDate("2026-12-31")).toBe("Dec 31");
  });

  it("does not zero-pad the day", () => {
    expect(formatShortDate("2026-04-03")).toBe("Apr 3");
  });

  it("avoids timezone off-by-one (Jan 1 stays Jan 1)", () => {
    // Uses T12:00:00 local time so no timezone can shift it to Dec 31
    expect(formatShortDate("2026-01-01")).toBe("Jan 1");
  });
});
