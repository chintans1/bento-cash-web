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

import { POST } from "@/app/api/lunch-money/route";

const client = {
  getMe: vi.fn(),
  getTransactionsForMonth: vi.fn(),
  getCategories: vi.fn(),
  getTags: vi.fn(),
  getAccounts: vi.fn(),
  getRecurringItems: vi.fn(),
  getBalanceHistory: vi.fn(),
  getBudgetSummary: vi.fn(),
  createManualAccount: vi.fn(),
  upsertBalanceHistory: vi.fn(),
  updateManualAccount: vi.fn(),
  updateTransaction: vi.fn(),
  updateTransactions: vi.fn(),
};

function request(body: unknown) {
  return new Request("https://bento.example/api/lunch-money", {
    method: "POST",
    headers: {
      origin: "https://bento.example",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.hasSameOrigin.mockReturnValue(true);
  mocks.getRequestUser.mockResolvedValue({ id: "user-1" });
  mocks.resolveLunchMoneyClient.mockReturnValue({ status: "ready", client });
});

describe("authenticated Lunch Money RPC", () => {
  it("rejects cross-origin requests before checking the session", async () => {
    mocks.hasSameOrigin.mockReturnValue(false);

    const response = await POST(
      request({ connectionId: "connection-1", action: "getMe", args: [] })
    );

    expect(response.status).toBe(403);
    expect(mocks.getRequestUser).not.toHaveBeenCalled();
  });

  it("requires a valid session", async () => {
    mocks.getRequestUser.mockResolvedValue(null);

    const response = await POST(
      request({ connectionId: "connection-1", action: "getMe", args: [] })
    );

    expect(response.status).toBe(401);
    expect(mocks.resolveLunchMoneyClient).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { connectionId: 1, action: "getMe", args: [] },
    { connectionId: "connection-1", action: 1, args: [] },
    { connectionId: "connection-1", action: "getMe", args: {} },
  ])("validates the RPC envelope (%j)", async (body) => {
    const response = await POST(request(body));

    expect(response.status).toBe(400);
    expect(mocks.resolveLunchMoneyClient).not.toHaveBeenCalled();
  });

  it("returns 404 without exposing another user's connection", async () => {
    mocks.resolveLunchMoneyClient.mockReturnValue({ status: "not_found" });

    const response = await POST(
      request({ connectionId: "connection-2", action: "getMe", args: [] })
    );

    expect(response.status).toBe(404);
    expect(mocks.resolveLunchMoneyClient).toHaveBeenCalledWith(
      "user-1",
      "connection-2"
    );
  });

  it("reports the future OAuth path without leaking credentials", async () => {
    mocks.resolveLunchMoneyClient.mockReturnValue({
      status: "unsupported_auth",
      authMethod: "oauth",
    });

    const response = await POST(
      request({ connectionId: "connection-1", action: "getMe", args: [] })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "This connection method is not available yet",
    });
  });

  it("rejects methods outside the explicit RPC allowlist", async () => {
    const response = await POST(
      request({
        connectionId: "connection-1",
        action: "getCredential",
        args: [],
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Unknown action" });
  });

  it.each([
    ["getMe", [], "getMe", []],
    [
      "getTransactionsForMonth",
      [2026, 9],
      "getTransactionsForMonth",
      [2026, 9],
    ],
    ["getCategories", [], "getCategories", []],
    ["getTags", [], "getTags", []],
    ["getAccounts", [], "getAccounts", []],
    ["getRecurringItems", [], "getRecurringItems", []],
    ["getBalanceHistory", [], "getBalanceHistory", []],
    ["getBudgetSummary", [2026, 9], "getBudgetSummary", [2026, 9]],
    [
      "createManualAccount",
      [{ name: "Mint account", type_name: "cash", balance: "10" }],
      "createManualAccount",
      [{ name: "Mint account", type_name: "cash", balance: "10" }],
    ],
    [
      "upsertBalanceHistory",
      ["manual", 7, [{ date: "2026-09-30", balance: "10" }]],
      "upsertBalanceHistory",
      ["manual", 7, [{ date: "2026-09-30", balance: "10" }]],
    ],
    [
      "updateManualAccount",
      [7, { balance: "12" }],
      "updateManualAccount",
      [7, { balance: "12" }],
    ],
    [
      "updateTransaction",
      [8, { payee: "Cafe" }],
      "updateTransaction",
      [8, { payee: "Cafe" }],
    ],
    [
      "updateTransactions",
      [[{ id: 9, payee: "Shop" }]],
      "updateTransactions",
      [[{ id: 9, payee: "Shop" }]],
    ],
  ] as const)(
    "dispatches allowed action %s",
    async (action, args, method, expectedArgs) => {
      const result = { action };
      client[method].mockResolvedValue(result);

      const response = await POST(
        request({ connectionId: "connection-1", action, args })
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ data: result });
      expect(client[method]).toHaveBeenCalledWith(...expectedArgs);
    }
  );

  it("maps provider failures to a safe gateway response", async () => {
    client.getMe.mockRejectedValue(new Error("Lunch Money unavailable"));

    const response = await POST(
      request({ connectionId: "connection-1", action: "getMe", args: [] })
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Lunch Money unavailable",
    });
  });
});
