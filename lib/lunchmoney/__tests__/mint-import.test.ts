import { describe, expect, it } from "vitest";
import type { ManualAccount } from "@lunch-money/lunch-money-js-v2";
import type { NormalizedAccount } from "../../account-utils";
import type { BalanceHistoryAccount } from "../client";
import {
  buildMintImportPreview,
  effectiveHistoryForMonths,
  findMintImportTargets,
  MINT_IMPORT_ACCOUNTS,
  parseMintTrendsCsv,
} from "../mint-import";

function history(
  id: number,
  side: "asset" | "debt",
  balances: [string, number][]
): BalanceHistoryAccount {
  return {
    source:
      side === "asset"
        ? { type: "manual", manual_account_id: id }
        : { type: "plaid", plaid_account_id: id },
    balances: balances.map(([month, to_base], index) => ({
      type: "historical",
      id: id * 100 + index,
      month,
      balance: String(to_base),
      currency: "usd",
      to_base,
      crypto_balance: null,
    })),
  } as BalanceHistoryAccount;
}

const ACCOUNTS = [
  { id: "manual-1", isLiability: false },
  { id: "plaid-2", isLiability: true },
] as NormalizedAccount[];

describe("parseMintTrendsCsv", () => {
  it("parses Mint currency fields and sorts months", () => {
    const result = parseMintTrendsCsv(
      [
        '"DATES","Assets","Debts","NET"',
        '"June 2018","$3,047.83","$27,420.59","-$24,372.76"',
        '"May 2018","$526.68","$27,608.05","-$27,081.37"',
      ].join("\r\n"),
      new Date("2026-09-13T00:00:00Z")
    );

    expect(result.rows).toEqual([
      { month: "2018-05", assets: 526.68, debts: 27608.05, net: -27081.37 },
      { month: "2018-06", assets: 3047.83, debts: 27420.59, net: -24372.76 },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("rejects rows whose net worth does not reconcile", () => {
    expect(() =>
      parseMintTrendsCsv(
        "DATES,Assets,Debts,NET\nMay 2018,$100.00,$20.00,$70.00",
        new Date("2026-09-13T00:00:00Z")
      )
    ).toThrow("NET does not equal Assets minus Debts");
  });

  it("warns about missing months without inventing values", () => {
    const result = parseMintTrendsCsv(
      "DATES,Assets,Debts,NET\nMay 2018,100,20,80\nJuly 2018,120,20,100",
      new Date("2026-09-13T00:00:00Z")
    );
    expect(result.rows).toHaveLength(2);
    expect(result.warnings[0]).toContain("skips 1 month range");
  });

  it("rejects currency values that cannot be represented safely", () => {
    expect(() =>
      parseMintTrendsCsv(
        "DATES,Assets,Debts,NET\nMay 2018,99999999999999999,0,99999999999999999",
        new Date("2026-09-13T00:00:00Z")
      )
    ).toThrow("outside the supported currency range");
  });
});

describe("effectiveHistoryForMonths", () => {
  it("carries balances across an interior gap for the requested months", () => {
    const totals = effectiveHistoryForMonths(
      ["2020-02", "2020-03", "2020-04"],
      [
        history(1, "asset", [
          ["2020-01", 100],
          ["2020-04", 140],
        ]),
        history(2, "debt", [
          ["2020-02", 20],
          ["2020-04", 10],
        ]),
      ],
      ACCOUNTS
    );

    expect(totals).toEqual([
      { month: "2020-02", assets: 100, debts: 20, hasHistory: true },
      { month: "2020-03", assets: 100, debts: 20, hasHistory: true },
      { month: "2020-04", assets: 140, debts: 10, hasHistory: true },
    ]);
  });
});

describe("buildMintImportPreview", () => {
  const rows = [
    { month: "2019-12", assets: 80, debts: 20, net: 60 },
    { month: "2020-01", assets: 120, debts: 25, net: 95 },
  ];
  const existing = [
    history(1, "asset", [["2020-01", 100]]),
    history(2, "debt", [["2020-01", 30]]),
  ];

  it("imports empty months and writes zero adjustments for kept conflicts", () => {
    const preview = buildMintImportPreview(
      rows,
      existing,
      ACCOUNTS,
      [],
      "keep_lunch_money"
    );

    expect(preview.rows[0]).toMatchObject({
      action: "import",
      assetAdjustment: 80,
      debtAdjustment: 20,
      resultNet: 60,
    });
    expect(preview.rows[1]).toMatchObject({
      action: "keep",
      assetAdjustment: 0,
      debtAdjustment: 0,
      resultNet: 70,
    });
    expect(preview).toMatchObject({
      emptyMonths: 1,
      conflictMonths: 1,
      keptMonths: 1,
    });
  });

  it("uses bridge values to make conflict months match Mint", () => {
    const preview = buildMintImportPreview(
      rows,
      existing,
      ACCOUNTS,
      [],
      "match_mint"
    );
    expect(preview.rows[1]).toMatchObject({
      action: "match",
      assetAdjustment: 20,
      debtAdjustment: -5,
      resultNet: 95,
    });
    expect(preview.negativeAdjustments).toBe(1);
  });

  it("excludes an existing import account from the Lunch Money baseline", () => {
    const imported = history(9, "asset", [["2020-01", 20]]);
    const preview = buildMintImportPreview(
      rows,
      [...existing, imported],
      [
        ...ACCOUNTS,
        { id: "manual-9", isLiability: false } as NormalizedAccount,
      ],
      [{ accountType: "manual", accountId: 9, side: "assets" }],
      "match_mint"
    );
    expect(preview.rows[1].lunchMoneyAssets).toBe(100);
    expect(preview.rows[1].assetAdjustment).toBe(20);
  });
});

describe("findMintImportTargets", () => {
  it("finds a previously created account by its stable external ID", () => {
    const account = {
      id: 44,
      external_id: MINT_IMPORT_ACCOUNTS.assets.externalId,
    } as ManualAccount;
    expect(findMintImportTargets([account], [])).toEqual([
      { accountType: "manual", accountId: 44, side: "assets" },
    ]);
  });
});
