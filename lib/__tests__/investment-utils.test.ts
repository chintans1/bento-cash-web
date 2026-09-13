import { describe, expect, it } from "vitest";
import { getInvestmentBucket } from "../investment-utils";

function bucketLabel(name: string, subtype: string | null): string | undefined {
  return getInvestmentBucket({ name, subtype })?.label;
}

describe("getInvestmentBucket", () => {
  it("treats the IRA subtype as tax-deferred retirement", () => {
    expect(bucketLabel("Fidelity Traditional IRA", "ira")).toBe(
      "Retirement — Tax Deferred"
    );
  });

  it("treats Roth IRA as tax-free when the provider reports a generic IRA", () => {
    expect(bucketLabel("Fidelity Roth IRA", "ira")).toBe(
      "Retirement — Tax Free"
    );
  });

  it("infers IRA tax treatment when the subtype is missing", () => {
    expect(bucketLabel("Fidelity Roth IRA", null)).toBe(
      "Retirement — Tax Free"
    );
    expect(bucketLabel("Fidelity Traditional IRA", null)).toBe(
      "Retirement — Tax Deferred"
    );
  });

  it("uses an explicit Roth IRA name even when the provider subtype is wrong", () => {
    expect(bucketLabel("Fidelity Roth IRA", "retirement")).toBe(
      "Retirement — Tax Free"
    );
  });

  it("still uses recognized subtypes for names that are not Roth IRAs", () => {
    expect(bucketLabel("IRA Savings Goal", "brokerage")).toBe(
      "Taxable Brokerage"
    );
  });
});
