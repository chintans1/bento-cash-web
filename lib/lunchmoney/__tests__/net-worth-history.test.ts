import { describe, expect, it } from "vitest";
import { computeNetWorthHistory, trailingMonths } from "../net-worth-history";
import type { BalanceHistoryAccount } from "../client";
import type { NormalizedAccount } from "../../account-utils";

function account(
  id: string,
  isLiability: boolean
): Pick<NormalizedAccount, "id" | "isLiability"> {
  return { id, isLiability };
}

const ACCOUNTS = [
  account("manual-1", false),
  account("plaid-2", true),
] as NormalizedAccount[];

function manual(
  id: number,
  balances: [month: string, toBase: number][]
): BalanceHistoryAccount {
  return {
    source: { type: "manual", manual_account_id: id },
    balances: balances.map(([month, to_base], i) => ({
      type: "historical",
      id: id * 100 + i,
      month,
      balance: String(to_base),
      currency: "usd",
      to_base,
      crypto_balance: null,
    })),
  } as BalanceHistoryAccount;
}

function plaid(
  id: number,
  balances: [month: string, toBase: number][]
): BalanceHistoryAccount {
  return {
    ...manual(id, balances),
    source: { type: "plaid", plaid_account_id: id },
  } as BalanceHistoryAccount;
}

describe("computeNetWorthHistory", () => {
  it("nets liabilities off assets, month by month", () => {
    const history = [
      manual(1, [
        ["2026-01", 1000],
        ["2026-02", 1200],
      ]),
      plaid(2, [
        ["2026-01", 400],
        ["2026-02", 300],
      ]),
    ];

    expect(computeNetWorthHistory(history, ACCOUNTS)).toEqual([
      {
        month: "2026-01",
        totalAssets: 1000,
        totalLiabilities: 400,
        netWorth: 600,
      },
      {
        month: "2026-02",
        totalAssets: 1200,
        totalLiabilities: 300,
        netWorth: 900,
      },
    ]);
  });

  it("returns months in ascending order regardless of response order", () => {
    const history = [
      manual(1, [
        ["2026-03", 30],
        ["2026-01", 10],
        ["2026-02", 20],
      ]),
    ];

    expect(
      computeNetWorthHistory(history, ACCOUNTS).map((p) => p.month)
    ).toEqual(["2026-01", "2026-02", "2026-03"]);
  });

  it("carries the last known balance across a gap inside an account's range", () => {
    // February is missing for account 1 — it existed, it just wasn't
    // snapshotted, so carrying 1000 forward is right and dropping it to 0
    // would draw a cliff that never happened.
    const history = [
      manual(1, [
        ["2026-01", 1000],
        ["2026-03", 1100],
      ]),
      manual(3, [
        ["2026-01", 5],
        ["2026-02", 5],
        ["2026-03", 5],
      ]),
    ];

    expect(
      computeNetWorthHistory(history, ACCOUNTS).map((p) => p.totalAssets)
    ).toEqual([1005, 1005, 1105]);
  });

  it("contributes nothing before an account's first month or after its last", () => {
    const history = [
      manual(1, [
        ["2026-01", 100],
        ["2026-02", 100],
        ["2026-03", 100],
      ]),
      // Opened in February, stopped being tracked after February.
      manual(3, [["2026-02", 50]]),
    ];

    expect(
      computeNetWorthHistory(history, ACCOUNTS).map((p) => p.totalAssets)
    ).toEqual([100, 150, 100]);
  });

  it("reads a deleted account's liability status from its archived type", () => {
    const history = [
      {
        source: {
          type: "deleted",
          deleted_account_id: 9,
          name: "Old Card",
          institution_name: null,
          display_name: null,
          account_type: "credit",
          subtype: null,
          mask: null,
          symbol: null,
        },
        balances: [
          {
            type: "historical",
            id: 1,
            month: "2026-01",
            balance: "250",
            currency: "usd",
            to_base: 250,
            crypto_balance: null,
          },
        ],
      } as BalanceHistoryAccount,
    ];

    expect(computeNetWorthHistory(history, ACCOUNTS)).toEqual([
      {
        month: "2026-01",
        totalAssets: 0,
        totalLiabilities: 250,
        netWorth: -250,
      },
    ]);
  });

  it("counts an account missing from the accounts list as an asset", () => {
    const history = [manual(404, [["2026-01", 75]])];

    expect(computeNetWorthHistory(history, ACCOUNTS)).toEqual([
      { month: "2026-01", totalAssets: 75, totalLiabilities: 0, netWorth: 75 },
    ]);
  });

  it("returns nothing for empty history", () => {
    expect(computeNetWorthHistory([], ACCOUNTS)).toEqual([]);
  });
});

describe("trailingMonths", () => {
  const points = ["2026-01", "2026-02", "2026-03", "2026-04"].map((month) => ({
    month,
    totalAssets: 0,
    totalLiabilities: 0,
    netWorth: 0,
  }));

  it("takes the last `count` months ending at the given month", () => {
    expect(trailingMonths(points, "2026-03", 2).map((p) => p.month)).toEqual([
      "2026-02",
      "2026-03",
    ]);
  });

  it("drops months after the end month", () => {
    expect(trailingMonths(points, "2026-02", 12).map((p) => p.month)).toEqual([
      "2026-01",
      "2026-02",
    ]);
  });

  it("returns everything available when there are fewer months than asked for", () => {
    expect(trailingMonths(points, "2026-04", 12)).toHaveLength(4);
  });
});
