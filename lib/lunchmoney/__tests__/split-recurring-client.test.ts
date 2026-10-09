import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  update: vi.fn(),
  delete: vi.fn(),
  get: vi.fn(),
  getAllRecurring: vi.fn(),
}));

vi.mock("@lunch-money/lunch-money-js-v2", () => ({
  LunchMoneyClient: class {
    transactions = sdk;
    recurringItems = { getAll: sdk.getAllRecurring };
  },
}));

import { createApiKeyClient } from "../client";

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("recurring items", () => {
  it("requests suggested items so linked transactions can be classified", async () => {
    sdk.getAllRecurring.mockResolvedValue([]);

    await createApiKeyClient("test-token").getRecurringItems();

    expect(sdk.getAllRecurring).toHaveBeenCalledWith({
      include_suggested: true,
    });
  });
});

describe("transaction deletion", () => {
  it("uses the v2 delete endpoint", async () => {
    sdk.delete.mockResolvedValue(undefined);

    await createApiKeyClient("test-token").deleteTransaction(10);

    expect(sdk.delete).toHaveBeenCalledWith(10);
  });
});

describe("split child recurring linking", () => {
  it("uses the v2 update when Lunch Money accepts it", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    sdk.update.mockResolvedValue({ id: 10, recurring_id: 24 });

    await expect(
      createApiKeyClient("test-token").updateSplitChildRecurring(10, 24)
    ).resolves.toMatchObject({ recurring_id: 24 });
    expect(sdk.update).toHaveBeenCalledWith(10, { recurring_id: 24 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to the documented v1 update and verifies the result", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ updated: true }));
    vi.stubGlobal("fetch", fetchMock);
    sdk.update.mockRejectedValue(new Error("Split child locked"));
    sdk.get.mockResolvedValue({ id: 10, recurring_id: 24 });

    await expect(
      createApiKeyClient("test-token").updateSplitChildRecurring(10, 24)
    ).resolves.toMatchObject({ recurring_id: 24 });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dev.lunchmoney.app/v1/transactions/10",
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ transaction: { id: 10, recurring_id: 24 } }),
      }
    );
    expect(sdk.get).toHaveBeenCalledWith(10);
  });

  it("reports a legacy response that did not update the link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ updated: false }))
    );
    sdk.update.mockRejectedValue(new Error("Split child locked"));
    await expect(
      createApiKeyClient("test-token").updateSplitChildRecurring(10, 24)
    ).rejects.toThrow("could not link");
  });
});

describe("ordinary split child edits", () => {
  it("falls back to v1 for editable fields and confirms reviewed status", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ updated: true }));
    vi.stubGlobal("fetch", fetchMock);
    sdk.update.mockRejectedValue(new Error("Split child locked"));
    sdk.get
      .mockResolvedValueOnce({ id: 10, split_parent_id: 7 })
      .mockResolvedValueOnce({
        id: 10,
        split_parent_id: 7,
        payee: "New rent",
        category_id: 4,
        tag_ids: [9],
        status: "reviewed",
      });

    await expect(
      createApiKeyClient("test-token").updateTransaction(10, {
        payee: "New rent",
        category_id: 4,
        tag_ids: [9],
        status: "reviewed",
      })
    ).resolves.toMatchObject({ status: "reviewed" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      transaction: {
        id: 10,
        payee: "New rent",
        category_id: 4,
        tags: [9],
        status: "cleared",
      },
    });
  });

  it("does not use v1 for a split child's amount", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    sdk.update.mockRejectedValue(new Error("Split child locked"));
    sdk.get.mockResolvedValue({ id: 10, split_parent_id: 7 });
    await expect(
      createApiKeyClient("test-token").updateTransaction(10, { amount: "4" })
    ).rejects.toThrow("Split child locked");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
