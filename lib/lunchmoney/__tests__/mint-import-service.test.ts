import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ManualAccount } from "@lunch-money/lunch-money-js-v2";
import type { BalanceHistoryAccount } from "../client";
import { buildMintImportPreview } from "../mint-import";

const api = vi.hoisted(() => ({
  createManualAccount: vi.fn(),
  getFreshBalanceImportData: vi.fn(),
  updateManualAccount: vi.fn(),
  upsertBalanceHistory: vi.fn(),
}));

vi.mock("../client", () => api);

import { applyMintImport, StaleMintImportError } from "../mint-import-service";

function manual(
  id: number,
  name: string,
  type: "other asset" | "other liability"
): ManualAccount {
  return {
    id,
    name,
    institution_name: "Bento Cash import",
    display_name: null,
    type,
    subtype: null,
    balance: "0",
    currency: "usd",
    to_base: 0,
    balance_as_of: "2020-02-29",
    status: "closed",
    closed_on: "2020-02-29",
    external_id:
      type === "other asset"
        ? "bento-cash:mint-aggregate-assets:v1"
        : "bento-cash:mint-aggregate-debts:v1",
    exclude_from_transactions: true,
    created_by_name: "Test",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function accountHistory(
  id: number,
  balances: [string, number][]
): BalanceHistoryAccount {
  return {
    source: { type: "manual", manual_account_id: id },
    balances: balances.map(([month, value], index) => ({
      type: "historical",
      id: id * 100 + index,
      month,
      balance: value.toFixed(2),
      currency: "usd",
      to_base: value,
      crypto_balance: null,
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("applyMintImport", () => {
  const rows = [
    { month: "2020-01", assets: 100, debts: 25, net: 75 },
    { month: "2020-02", assets: 120, debts: 20, net: 100 },
  ];
  const emptyPreview = buildMintImportPreview(
    rows,
    [],
    [],
    [],
    "keep_lunch_money"
  );

  it("creates two closed accounts, writes both histories, and verifies the result", async () => {
    const assets = manual(10, "Mint historical assets", "other asset");
    const debts = manual(11, "Mint historical debts", "other liability");
    api.getFreshBalanceImportData
      .mockResolvedValueOnce({ manual: [], plaid: [], history: [] })
      .mockResolvedValueOnce({
        manual: [assets, debts],
        plaid: [],
        history: [
          accountHistory(10, [
            ["2020-01", 100],
            ["2020-02", 120],
          ]),
          accountHistory(11, [
            ["2020-01", 25],
            ["2020-02", 20],
          ]),
        ],
      });
    api.createManualAccount
      .mockResolvedValueOnce(assets)
      .mockResolvedValueOnce(debts);
    api.upsertBalanceHistory.mockResolvedValue({});

    await expect(
      applyMintImport(rows, "keep_lunch_money", "usd", emptyPreview.signature)
    ).resolves.toMatchObject({ monthsProcessed: 2, emptyMonthsFilled: 2 });

    expect(api.createManualAccount).toHaveBeenCalledTimes(2);
    expect(api.createManualAccount).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        name: "Mint historical assets",
        type: "other asset",
        currency: "usd",
        status: "closed",
        closed_on: "2020-02-29",
      })
    );
    expect(api.upsertBalanceHistory).toHaveBeenNthCalledWith(1, "manual", 10, [
      { month: "2020-01", balance: "100.00", currency: "usd" },
      { month: "2020-02", balance: "120.00", currency: "usd" },
    ]);
    expect(api.upsertBalanceHistory).toHaveBeenNthCalledWith(2, "manual", 11, [
      { month: "2020-01", balance: "25.00", currency: "usd" },
      { month: "2020-02", balance: "20.00", currency: "usd" },
    ]);
  });

  it("stops before any write when Lunch Money changed after the preview", async () => {
    api.getFreshBalanceImportData.mockResolvedValue({
      manual: [],
      plaid: [],
      history: [accountHistory(99, [["2020-01", 1]])],
    });

    await expect(
      applyMintImport(rows, "keep_lunch_money", "usd", emptyPreview.signature)
    ).rejects.toBeInstanceOf(StaleMintImportError);
    expect(api.createManualAccount).not.toHaveBeenCalled();
    expect(api.upsertBalanceHistory).not.toHaveBeenCalled();
  });

  it("reuses the same import accounts when the file is imported again", async () => {
    const assets = manual(10, "Mint historical assets", "other asset");
    const debts = manual(11, "Mint historical debts", "other liability");
    const importedHistory = [
      accountHistory(10, [
        ["2020-01", 100],
        ["2020-02", 120],
      ]),
      accountHistory(11, [
        ["2020-01", 25],
        ["2020-02", 20],
      ]),
    ];
    api.getFreshBalanceImportData
      .mockResolvedValueOnce({
        manual: [assets, debts],
        plaid: [],
        history: importedHistory,
      })
      .mockResolvedValueOnce({
        manual: [assets, debts],
        plaid: [],
        history: importedHistory,
      });
    api.updateManualAccount.mockResolvedValue(undefined);
    api.upsertBalanceHistory.mockResolvedValue({});

    await applyMintImport(
      rows,
      "keep_lunch_money",
      "usd",
      emptyPreview.signature
    );

    expect(api.createManualAccount).not.toHaveBeenCalled();
    expect(api.updateManualAccount).toHaveBeenCalledTimes(2);
    expect(api.upsertBalanceHistory).toHaveBeenCalledTimes(2);
  });

  it("validates every existing import account before creating a missing one", async () => {
    const invalidDebtAccount = {
      ...manual(11, "Mint historical debts", "other liability"),
      currency: "cad",
    } as ManualAccount;
    api.getFreshBalanceImportData.mockResolvedValue({
      manual: [invalidDebtAccount],
      plaid: [],
      history: [],
    });

    await expect(
      applyMintImport(rows, "keep_lunch_money", "usd", emptyPreview.signature)
    ).rejects.toThrow("no longer matches the required type and currency");

    expect(api.createManualAccount).not.toHaveBeenCalled();
    expect(api.updateManualAccount).not.toHaveBeenCalled();
    expect(api.upsertBalanceHistory).not.toHaveBeenCalled();
  });
});
