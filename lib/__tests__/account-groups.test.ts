import { describe, expect, it } from "vitest";
import type { NormalizedAccount } from "@/lib/account-utils";
import {
  assetComposition,
  groupAccounts,
  getAccountGroup,
  liabilityComposition,
} from "@/lib/account-groups";

function account(
  overrides: Partial<NormalizedAccount> = {}
): NormalizedAccount {
  return {
    id: "manual-1",
    rawId: 1,
    name: "Checking",
    institution: "Bank",
    type: "cash",
    subtype: "checking",
    balance: 100,
    creditLimit: null,
    currency: "usd",
    toBase: 100,
    balanceValid: true,
    isLiability: false,
    lastUpdated: null,
    source: "manual",
    status: "active",
    allowTransactionModifications: true,
    ...overrides,
  };
}

describe("account grouping", () => {
  it("separates checking, savings, and unspecified cash with independent totals", () => {
    const groups = groupAccounts(
      [
        account({ subtype: " Savings ", toBase: 300 }),
        account({ subtype: null, toBase: 25 }),
        account({ subtype: "checking", toBase: 100 }),
      ],
      "type"
    );
    expect(groups.map(({ id, total }) => ({ id, total }))).toEqual([
      { id: "checking", total: 100 },
      { id: "savings", total: 300 },
      { id: "other-cash", total: 25 },
    ]);
  });

  it("nets liabilities in institution totals using valid base-currency balances", () => {
    const groups = groupAccounts(
      [
        account({ name: "Savings", balance: 200, toBase: 250 }),
        account({
          id: "card",
          name: "Card",
          type: "credit",
          isLiability: true,
          toBase: 75,
        }),
        account({ id: "revoked", balanceValid: false, toBase: 900 }),
      ],
      "institution"
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].total).toBe(175);
  });

  it("sorts cash, credit cards, and investments inside each institution", () => {
    const groups = groupAccounts(
      [
        account({
          institution: "Zebra",
          name: "A Brokerage",
          type: "investment",
          subtype: "brokerage",
        }),
        account({
          institution: "Ally",
          name: "A Retirement",
          type: "investment",
          subtype: "401k",
        }),
        account({
          institution: "Zebra",
          name: "B Credit Card",
          type: "credit",
          isLiability: true,
        }),
        account({ institution: "Ally", name: "Z Checking" }),
        account({
          institution: "Zebra",
          name: "Y Savings",
          subtype: "savings",
        }),
        account({ institution: "Zebra", name: "Z Checking" }),
      ],
      "institution"
    );
    expect(
      groups.map(({ label, accounts }) => [
        label,
        accounts.map(({ name }) => name),
      ])
    ).toEqual([
      ["Ally", ["Z Checking", "A Retirement"]],
      ["Zebra", ["Y Savings", "Z Checking", "B Credit Card", "A Brokerage"]],
    ]);
  });

  it("keeps debt balances positive when grouping by type", () => {
    const groups = groupAccounts(
      [
        account({ type: "credit", isLiability: true, toBase: 75 }),
        account({ type: "loan", isLiability: true, toBase: 500 }),
      ],
      "type"
    );
    expect(
      groups.map(({ id, total, isLiability }) => ({ id, total, isLiability }))
    ).toEqual([
      { id: "credit", total: 75, isLiability: true },
      { id: "loans", total: 500, isLiability: true },
    ]);
  });

  it("orders all brokerage accounts before stock plans, 401(k)s, and IRAs within an institution", () => {
    const groups = groupAccounts(
      [
        account({ name: "A Roth IRA", type: "investment", subtype: "roth" }),
        account({
          name: "A brokerage",
          type: "investment",
          subtype: "brokerage",
        }),
        account({ name: "B 401(k)", type: "investment", subtype: null }),
        account({
          name: "C workplace plan",
          type: "investment",
          subtype: "roth 401k",
        }),
        account({
          name: "D stock plan",
          type: "investment",
          subtype: "stock plan",
        }),
        account({
          name: "E brokerage",
          type: "investment",
          subtype: "brokerage",
        }),
        account({ name: "A HSA", type: "investment", subtype: "hsa" }),
      ],
      "institution"
    );
    expect(groups[0].accounts.map(({ name }) => name)).toEqual([
      "A brokerage",
      "E brokerage",
      "D stock plan",
      "B 401(k)",
      "C workplace plan",
      "A Roth IRA",
      "A HSA",
    ]);
  });

  it("recognizes investment subtypes without reclassifying liabilities", () => {
    expect(getAccountGroup(account({ subtype: "ira" }))).toBe(
      "tax-deferred-retirement"
    );
    expect(
      getAccountGroup(
        account({ type: "loan", subtype: "ira", isLiability: true })
      )
    ).toBe("loans");
  });

  it("keeps institutions together and puts brokerage before stock plans in the by-type view", () => {
    const groups = groupAccounts(
      [
        account({
          institution: "Fidelity",
          name: "Fidelity HubSpot ESPP",
          type: "investment",
          subtype: "stock plan",
        }),
        account({
          institution: "Vanguard",
          name: "Brokerage",
          type: "investment",
          subtype: "brokerage",
        }),
        account({
          institution: "Fidelity",
          name: "Fidelity Personal Investing",
          type: "investment",
          subtype: "brokerage",
        }),
        account({
          institution: "Fidelity",
          name: "Fidelity Bloom Save",
          type: "investment",
          subtype: "brokerage",
        }),
      ],
      "type"
    );
    expect(groups.map(({ id }) => id)).toEqual(["taxable-brokerage"]);
    expect(groups[0].accounts.map(({ name }) => name)).toEqual([
      "Fidelity Bloom Save",
      "Fidelity Personal Investing",
      "Fidelity HubSpot ESPP",
      "Brokerage",
    ]);
  });

  it("sorts institutions and gives missing institutions a fallback", () => {
    expect(
      groupAccounts(
        [
          account({ institution: "Zebra" }),
          account({ institution: "  " }),
          account({ institution: "Ally" }),
        ],
        "institution"
      ).map(({ label }) => label)
    ).toEqual(["Ally", "Other", "Zebra"]);
  });
});

describe("asset composition", () => {
  it("excludes closed, unavailable, and liability balances and uses the primary currency", () => {
    const rows = assetComposition([
      account({ balance: 50, toBase: 100 }),
      account({ type: "investment", toBase: 300 }),
      account({ status: "closed", toBase: 1000 }),
      account({ balanceValid: false, toBase: 1000 }),
      account({ type: "credit", isLiability: true, toBase: 1000 }),
    ]);
    expect(
      rows.map(({ id, amount, percent }) => ({ id, amount, percent }))
    ).toEqual([
      { id: "checking", amount: 100, percent: 25 },
      { id: "other-investments", amount: 300, percent: 75 },
    ]);
  });

  it("shows checking and savings as distinct composition segments", () => {
    const rows = assetComposition([
      account({ subtype: "checking", toBase: 100 }),
      account({ subtype: "savings", toBase: 300 }),
    ]);
    expect(rows.map(({ id, percent }) => ({ id, percent }))).toEqual([
      { id: "checking", percent: 25 },
      { id: "savings", percent: 75 },
    ]);
    expect(rows[0].color).not.toBe(rows[1].color);
  });

  it("uses the same investment categories and totals in the list and composition", () => {
    const investments = [
      account({ type: "investment", subtype: "401k", toBase: 300 }),
      account({
        type: "investment",
        name: "Roth IRA",
        subtype: "ira",
        toBase: 200,
      }),
      account({ type: "investment", subtype: "brokerage", toBase: 400 }),
      account({ type: "cryptocurrency", subtype: null, toBase: 50 }),
      account({ type: "investment", subtype: null, toBase: 50 }),
    ];
    expect(
      groupAccounts(investments, "type").map(({ id, total }) => [id, total])
    ).toEqual([
      ["tax-deferred-retirement", 300],
      ["tax-free-retirement", 200],
      ["taxable-brokerage", 400],
      ["crypto", 50],
      ["other-investments", 50],
    ]);
    expect(
      assetComposition(investments).map(({ id, percent }) => [id, percent])
    ).toEqual([
      ["tax-deferred-retirement", 30],
      ["tax-free-retirement", 20],
      ["taxable-brokerage", 40],
      ["crypto", 5],
      ["other-investments", 5],
    ]);
  });

  it("handles zero and negative asset groups without invalid chart percentages", () => {
    expect(assetComposition([account({ toBase: 0 })])).toEqual([]);
    expect(assetComposition([account({ toBase: -100 })])).toEqual([]);
    const rows = assetComposition([
      account({ toBase: -100 }),
      account({ type: "investment", toBase: 200 }),
    ]);
    expect(rows[0].percent).toBe(100);
  });
});

describe("liability composition", () => {
  it("splits positive debt balances and excludes closed or unavailable accounts", () => {
    const rows = liabilityComposition([
      account({ type: "credit", isLiability: true, toBase: 180 }),
      account({ type: "loan", isLiability: true, balance: 650, toBase: 820 }),
      account({
        type: "loan",
        isLiability: true,
        status: "closed",
        toBase: 500,
      }),
      account({
        type: "credit",
        isLiability: true,
        balanceValid: false,
        toBase: 500,
      }),
      account({ type: "other liability", isLiability: true, toBase: -25 }),
      account({ toBase: 1000 }),
    ]);
    expect(
      rows.map(({ id, amount, percent }) => ({ id, amount, percent }))
    ).toEqual([
      { id: "loans", amount: 820, percent: 82 },
      { id: "credit", amount: 180, percent: 18 },
    ]);
  });
});
