import { afterEach, describe, expect, it, vi } from "vitest";
import { createRemoteClient } from "@/lib/lunchmoney/client";

afterEach(() => vi.unstubAllGlobals());

describe("remote Lunch Money client", () => {
  it("uses resource routes for reads", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ data: { transactions: [], has_more: false } })
      );
    vi.stubGlobal("fetch", fetchMock);
    const client = createRemoteClient("connection 1");

    await client.getTransactionsForMonth(2026, 9);
    await client.getCategories();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/lunch-money/transactions?year=2026&month=9&connectionId=connection%201",
      { method: "GET", cache: "no-store" }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/lunch-money/categories?connectionId=connection%201",
      { method: "GET", cache: "no-store" }
    );
  });

  it("sends writes to their own route without action or positional args", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: {} }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createRemoteClient("connection-1");

    await client.updateTransaction(8, { payee: "Cafe" });
    await client.createManualAccount({ name: "Cash" } as Parameters<
      typeof client.createManualAccount
    >[0]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/lunch-money/transactions/8",
      {
        method: "PATCH",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          connectionId: "connection-1",
          patch: { payee: "Cafe" },
        }),
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/lunch-money/accounts/manual",
      {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          connectionId: "connection-1",
          data: { name: "Cash" },
        }),
      }
    );
  });

  it("loads manual and Plaid accounts through separate requests", async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        Response.json({
          data: url.includes("/manual") ? [{ id: 1 }] : [{ id: 2 }],
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getAccounts } = createRemoteClient("connection-1");
    const accounts = await getAccounts();

    expect(accounts).toEqual({ manual: [{ id: 1 }], plaid: [{ id: 2 }] });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/lunch-money/accounts/manual?connectionId=connection-1",
      "/api/lunch-money/accounts/plaid?connectionId=connection-1",
    ]);
  });

  it("routes split and group operations with connection ownership data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: {} }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createRemoteClient("connection-1");
    const children = [
      { amount: "4", payee: "A" },
      { amount: "6", payee: "B" },
    ];

    await client.getTransaction(8);
    await client.updateSplitChildRecurring(8, 27);
    await client.splitTransaction(8, children);
    await client.replaceSplit(8, children);
    await client.unsplitTransaction(8);
    await client.groupTransactions({
      ids: [8, 9],
      date: "2026-09-01",
      payee: "Combined",
    });
    await client.ungroupTransaction(12);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/lunch-money/transactions/8?connectionId=connection-1",
      "/api/lunch-money/transactions/8/recurring",
      "/api/lunch-money/transactions/8/split",
      "/api/lunch-money/transactions/8/split",
      "/api/lunch-money/transactions/8/split",
      "/api/lunch-money/transactions/group",
      "/api/lunch-money/transactions/group/12",
    ]);
    expect(fetchMock.mock.calls.map(([, options]) => options.method)).toEqual([
      "GET",
      "PATCH",
      "POST",
      "PUT",
      "DELETE",
      "POST",
      "DELETE",
    ]);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      connectionId: "connection-1",
      recurringId: 27,
    });
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual({
      connectionId: "connection-1",
      children,
      recurringIds: [null, null],
    });
    expect(JSON.parse(fetchMock.mock.calls[5][1].body)).toEqual({
      connectionId: "connection-1",
      input: { ids: [8, 9], date: "2026-09-01", payee: "Combined" },
    });
  });
});
