import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestUser: vi.fn(),
  hasSameOrigin: vi.fn(),
  resolveLunchMoneyClient: vi.fn(),
}));

vi.mock("@/lib/server/session", () => ({
  getRequestUser: mocks.getRequestUser,
  hasSameOrigin: mocks.hasSameOrigin,
}));
vi.mock("@/lib/server/lunch-money-client", () => ({
  resolveLunchMoneyClient: mocks.resolveLunchMoneyClient,
}));

import { GET as getMe } from "@/app/api/lunch-money/me/route";
import { GET as getTransactions } from "@/app/api/lunch-money/transactions/route";
import { PATCH as updateTransaction } from "@/app/api/lunch-money/transactions/[id]/route";
import { PATCH as updateTransactions } from "@/app/api/lunch-money/transactions/bulk/route";
import { GET as getCategories } from "@/app/api/lunch-money/categories/route";
import { GET as getTags } from "@/app/api/lunch-money/tags/route";
import {
  GET as getManualAccounts,
  POST as createManualAccount,
} from "@/app/api/lunch-money/accounts/manual/route";
import { GET as getPlaidAccounts } from "@/app/api/lunch-money/accounts/plaid/route";
import { PATCH as updateManualAccount } from "@/app/api/lunch-money/accounts/manual/[id]/route";
import { GET as getRecurringItems } from "@/app/api/lunch-money/recurring-items/route";
import {
  GET as getBalanceHistory,
  PUT as upsertBalanceHistory,
} from "@/app/api/lunch-money/balance-history/route";
import { GET as getBudgetSummary } from "@/app/api/lunch-money/budget-summary/route";

const client = {
  getMe: vi.fn(),
  getTransactionsForMonth: vi.fn(),
  getCategories: vi.fn(),
  getTags: vi.fn(),
  getManualAccounts: vi.fn(),
  getPlaidAccounts: vi.fn(),
  getRecurringItems: vi.fn(),
  getBalanceHistory: vi.fn(),
  getBudgetSummary: vi.fn(),
  createManualAccount: vi.fn(),
  upsertBalanceHistory: vi.fn(),
  updateManualAccount: vi.fn(),
  updateTransaction: vi.fn(),
  updateTransactions: vi.fn(),
};

function request(path: string, method = "GET", body?: object) {
  return new Request(`https://bento.example/api/lunch-money/${path}`, {
    method,
    headers: {
      origin: "https://bento.example",
      ...(body && { "content-type": "application/json" }),
    },
    ...(body && {
      body: JSON.stringify({ connectionId: "connection-1", ...body }),
    }),
  });
}

const query = "connectionId=connection-1";
const monthQuery = `${query}&year=2026&month=9`;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.hasSameOrigin.mockReturnValue(true);
  mocks.getRequestUser.mockResolvedValue({ id: "user-1" });
  mocks.resolveLunchMoneyClient.mockReturnValue({ status: "ready", client });
});

describe("authenticated Lunch Money routes", () => {
  it("rejects cross-origin writes before checking the session", async () => {
    mocks.hasSameOrigin.mockReturnValue(false);
    const response = await createManualAccount(
      request("accounts/manual", "POST", { data: {} })
    );
    expect(response.status).toBe(403);
    expect(mocks.getRequestUser).not.toHaveBeenCalled();
  });

  it("requires a session and owned connection", async () => {
    mocks.getRequestUser.mockResolvedValueOnce(null);
    expect((await getMe(request(`me?${query}`))).status).toBe(401);
    mocks.resolveLunchMoneyClient.mockReturnValueOnce({ status: "not_found" });
    expect((await getMe(request(`me?${query}`))).status).toBe(404);
    expect(mocks.resolveLunchMoneyClient).toHaveBeenCalledWith(
      "user-1",
      "connection-1"
    );
  });

  it("reports an unsupported connection method", async () => {
    mocks.resolveLunchMoneyClient.mockReturnValue({
      status: "unsupported_auth",
      authMethod: "oauth",
    });
    expect((await getMe(request(`me?${query}`))).status).toBe(409);
  });

  it("validates endpoint inputs before opening a connection", async () => {
    expect(
      (
        await getTransactions(
          request(`transactions?${query}&year=2026&month=13`)
        )
      ).status
    ).toBe(400);
    expect(
      (
        await updateTransaction(
          request("transactions/nope", "PATCH", { patch: {} }),
          { params: Promise.resolve({ id: "nope" }) }
        )
      ).status
    ).toBe(400);
    expect(
      (
        await createManualAccount(
          request("accounts/manual", "POST", { data: "bad" })
        )
      ).status
    ).toBe(400);
    expect(mocks.resolveLunchMoneyClient).not.toHaveBeenCalled();
  });

  it.each([
    ["me", getMe, `me?${query}`, "GET", undefined, "getMe", []],
    [
      "transactions",
      getTransactions,
      `transactions?${monthQuery}`,
      "GET",
      undefined,
      "getTransactionsForMonth",
      [2026, 9],
    ],
    [
      "categories",
      getCategories,
      `categories?${query}`,
      "GET",
      undefined,
      "getCategories",
      [],
    ],
    ["tags", getTags, `tags?${query}`, "GET", undefined, "getTags", []],
    [
      "manual accounts",
      getManualAccounts,
      `accounts/manual?${query}`,
      "GET",
      undefined,
      "getManualAccounts",
      [],
    ],
    [
      "Plaid accounts",
      getPlaidAccounts,
      `accounts/plaid?${query}`,
      "GET",
      undefined,
      "getPlaidAccounts",
      [],
    ],
    [
      "recurring",
      getRecurringItems,
      `recurring-items?${query}`,
      "GET",
      undefined,
      "getRecurringItems",
      [],
    ],
    [
      "history",
      getBalanceHistory,
      `balance-history?${query}`,
      "GET",
      undefined,
      "getBalanceHistory",
      [],
    ],
    [
      "budget",
      getBudgetSummary,
      `budget-summary?${monthQuery}`,
      "GET",
      undefined,
      "getBudgetSummary",
      [2026, 9],
    ],
    [
      "create account",
      createManualAccount,
      "accounts/manual",
      "POST",
      { data: { name: "Cash" } },
      "createManualAccount",
      [{ name: "Cash" }],
    ],
    [
      "update history",
      upsertBalanceHistory,
      "balance-history",
      "PUT",
      {
        accountType: "manual",
        accountId: 7,
        balances: [{ date: "2026-09-30", balance: "10" }],
      },
      "upsertBalanceHistory",
      ["manual", 7, [{ date: "2026-09-30", balance: "10" }]],
    ],
    [
      "bulk transactions",
      updateTransactions,
      "transactions/bulk",
      "PATCH",
      { transactions: [{ id: 9, payee: "Shop" }] },
      "updateTransactions",
      [[{ id: 9, payee: "Shop" }]],
    ],
  ] as const)(
    "routes %s",
    async (name, handler, path, method, body, clientMethod, args) => {
      const result = { name };
      client[clientMethod].mockResolvedValue(result);
      const response = await handler(request(path, method, body));
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      await expect(response.json()).resolves.toEqual({ data: result });
      expect(client[clientMethod]).toHaveBeenCalledWith(...args);
    }
  );

  it("routes individual writes", async () => {
    client.updateTransaction.mockResolvedValue({ id: 8 });
    client.updateManualAccount.mockResolvedValue(undefined);
    const transaction = await updateTransaction(
      request("transactions/8", "PATCH", { patch: { payee: "Cafe" } }),
      { params: Promise.resolve({ id: "8" }) }
    );
    const account = await updateManualAccount(
      request("accounts/manual/7", "PATCH", { data: { balance: "12" } }),
      { params: Promise.resolve({ id: "7" }) }
    );
    expect(transaction.status).toBe(200);
    expect(account.status).toBe(200);
    expect(client.updateTransaction).toHaveBeenCalledWith(8, { payee: "Cafe" });
    expect(client.updateManualAccount).toHaveBeenCalledWith(7, {
      balance: "12",
    });
  });

  it("maps provider failures", async () => {
    client.getMe.mockRejectedValue(new Error("Lunch Money unavailable"));
    const response = await getMe(request(`me?${query}`));
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Lunch Money unavailable",
    });
  });
});
