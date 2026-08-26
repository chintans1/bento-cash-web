import { describe, expect, it } from "vitest";
import { computeAllocation, computeContributions } from "../investment-utils";
import type { NormalizedAccount } from "../account-utils";
import type { Transaction } from "../lunchmoney/client";

function account(over: Partial<NormalizedAccount> = {}): NormalizedAccount {
  return {
    id: "manual-1",
    rawId: 1,
    name: "Brokerage",
    institution: "Schwab",
    type: "investment",
    subtype: "brokerage",
    balance: 1000,
    currency: "usd",
    toBase: 1000,
    balanceValid: true,
    isLiability: false,
    lastUpdated: "2026-08-01",
    source: "manual",
    status: "active",
    ...over,
  } as NormalizedAccount;
}

function tx(over: Partial<Transaction> = {}): Transaction {
  return {
    id: 1,
    date: "2026-08-02",
    payee: "Vanguard",
    amount: "500.00",
    to_base: 500,
    currency: "usd",
    category_id: null,
    notes: null,
    plaid_account_id: null,
    manual_account_id: null,
    is_pending: false,
    ...over,
  } as unknown as Transaction;
}

describe("computeAllocation", () => {
  it("returns shares that sum to 100 and sorts by value", () => {
    const slices = computeAllocation([
      account({ id: "manual-1", rawId: 1, toBase: 2500 }),
      account({ id: "manual-2", rawId: 2, toBase: 7500 }),
    ]);

    expect(slices.map((s) => s.value)).toEqual([7500, 2500]);
    expect(slices.map((s) => Math.round(s.share))).toEqual([75, 25]);
  });

  it("ignores non-investment, closed and unreadable accounts", () => {
    const slices = computeAllocation([
      account({ id: "a", type: "cash", subtype: "checking" }),
      account({ id: "b", status: "closed" }),
      account({ id: "c", balanceValid: false }),
    ]);
    expect(slices).toHaveLength(0);
  });

  it("does not divide by zero when everything is empty", () => {
    const slices = computeAllocation([account({ toBase: 0 })]);
    expect(slices[0].share).toBe(0);
  });
});

describe("computeContributions", () => {
  const accounts = [account({ id: "manual-1", rawId: 1 })];

  it("counts debits in and credits out of investment accounts", () => {
    const result = computeContributions(
      [
        tx({ id: 1, amount: "500.00", to_base: 500, manual_account_id: 1 }),
        tx({ id: 2, amount: "-200.00", to_base: -200, manual_account_id: 1 }),
      ],
      accounts
    );

    expect(result).toEqual({ net: 300, contributed: 500, withdrawn: 200 });
  });

  it("ignores transactions on other accounts", () => {
    const result = computeContributions(
      [tx({ manual_account_id: 99 }), tx({ manual_account_id: null })],
      accounts
    );
    expect(result.net).toBe(0);
  });

  it("ignores pending transactions", () => {
    const result = computeContributions(
      [tx({ manual_account_id: 1, is_pending: true })],
      accounts
    );
    expect(result.net).toBe(0);
  });

  it("falls back to the raw amount when to_base is absent", () => {
    const result = computeContributions(
      [tx({ manual_account_id: 1, to_base: undefined })],
      accounts
    );
    expect(result.contributed).toBe(500);
  });
});
