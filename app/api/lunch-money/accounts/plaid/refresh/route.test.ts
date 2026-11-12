import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiKeyClient } from "@/lib/lunchmoney/client";
import { PLAID_REFRESH_COOLDOWN_MS } from "@/lib/lunchmoney/plaid-refresh";
import { migrations } from "@/lib/server/migrations";
import type { SqlParams } from "@/lib/server/database";
import { GET, POST } from "./route";

const mocks = vi.hoisted(() => ({
  getStore: vi.fn(),
  triggerPlaidFetch: vi.fn(),
  resolveLunchMoneyClient: vi.fn(),
}));

vi.mock("@/lib/server/database", () => ({ getStore: mocks.getStore }));
vi.mock("@/lib/server/lunch-money-client", () => ({
  resolveLunchMoneyClient: mocks.resolveLunchMoneyClient,
}));
vi.mock("@/lib/server/session", () => ({
  getRequestUser: async (request: Request) => {
    const id = request.headers.get("x-test-user");
    return id ? { id } : null;
  },
  hasSameOrigin: (request: Request) =>
    request.headers.get("origin") === "https://bento.test",
}));

const url = "https://bento.test/api/lunch-money/accounts/plaid/refresh";
let database: DatabaseSync;

function post(
  userId: string,
  connectionId: string,
  origin = "https://bento.test"
) {
  return POST(
    new Request(`${url}?id=77`, {
      method: "POST",
      headers: { "x-test-user": userId, origin },
      body: JSON.stringify({ connectionId, id: 77 }),
    })
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  database = new DatabaseSync(":memory:");
  for (const [, sql] of migrations) database.exec(sql);

  for (const [userId, connectionId, budgetId] of [
    ["owner", "a", "shared"],
    ["member", "b", "shared"],
    ["other", "c", "separate"],
  ]) {
    database
      .prepare(
        'insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt") values (?, ?, ?, 0, 1, 1)'
      )
      .run(userId, userId, `${userId}@bento.test`);
    database
      .prepare(
        `insert into "lunch_money_connection"
      ("id", "userId", "externalAccountId", "label", "authMethod", "credentialCiphertext", "createdAt", "updatedAt")
      values (?, ?, ?, 'Budget', 'api_key', 'unused', 'today', 'today')`
      )
      .run(connectionId, userId, budgetId);
  }

  mocks.getStore.mockResolvedValue({
    first: async (sql: string, params: SqlParams = []) =>
      database.prepare(sql).get(...params),
    run: async (sql: string, params: SqlParams = []) => ({
      changes: Number(database.prepare(sql).run(...params).changes),
    }),
  });
  mocks.resolveLunchMoneyClient.mockResolvedValue({
    status: "ready",
    client: { triggerPlaidFetch: mocks.triggerPlaidFetch },
  });
  mocks.triggerPlaidFetch.mockResolvedValue({ queued: true });
  vi.spyOn(Date, "now").mockReturnValue(1_000_000);
});

afterEach(() => {
  database.close();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("budget-wide Plaid refresh", () => {
  it("queues one request per budget across simultaneous connections and reopens after five minutes", async () => {
    const [first, second] = await Promise.all([
      post("owner", "a"),
      post("member", "b"),
    ]);
    expect([first.status, second.status].sort()).toEqual([202, 429]);
    const limited = first.status === 429 ? first : second;
    expect(limited.headers.get("retry-after")).toBe("300");
    expect(mocks.triggerPlaidFetch.mock.calls).toEqual([[]]);

    const retryAt = Date.now() + PLAID_REFRESH_COOLDOWN_MS;
    const status = await GET(
      new Request(`${url}?connectionId=b`, {
        headers: { "x-test-user": "member" },
      })
    );
    expect(await status.json()).toEqual({ retryAt });
    expect((await post("other", "c")).status).toBe(202);
    vi.mocked(Date.now).mockReturnValue(retryAt - 1);
    expect((await post("owner", "a")).status).toBe(429);
    vi.mocked(Date.now).mockReturnValue(retryAt);
    expect((await post("owner", "a")).status).toBe(202);
  });

  it("rejects unauthenticated, foreign-origin, and unowned requests", async () => {
    expect((await GET(new Request(`${url}?connectionId=a`))).status).toBe(401);
    expect((await post("owner", "a", "https://outside.test")).status).toBe(403);
    expect((await post("member", "a")).status).toBe(404);
    expect(mocks.triggerPlaidFetch).not.toHaveBeenCalled();
  });

  it("keeps a longer upstream retry window for the entire budget", async () => {
    const retryAt = Date.now() + 600_000;
    mocks.triggerPlaidFetch.mockResolvedValue({ queued: false, retryAt });
    const first = await post("owner", "a");
    expect(first.status).toBe(429);
    expect(first.headers.get("retry-after")).toBe("600");
    expect(await (await post("member", "b")).json()).toEqual({ retryAt });
    expect(mocks.triggerPlaidFetch).toHaveBeenCalledTimes(1);
  });

  it("sends an all-account request and reads the upstream Retry-After header", async () => {
    const upstream = vi.fn<(request: Request) => Promise<Response>>();
    upstream.mockResolvedValueOnce(new Response(null, { status: 202 }));
    upstream.mockResolvedValueOnce(
      new Response(null, { status: 429, headers: { "Retry-After": "420" } })
    );
    vi.stubGlobal("fetch", upstream);
    mocks.resolveLunchMoneyClient.mockResolvedValue({
      status: "ready",
      client: createApiKeyClient("fixture-token"),
    });

    expect((await post("owner", "a")).status).toBe(202);
    const request = upstream.mock.calls[0][0];
    expect(request.method).toBe("POST");
    expect(request.url).toBe(
      "https://api.lunchmoney.dev/v2/plaid_accounts/fetch"
    );
    const limited = await post("other", "c");
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("420");
  });
});
