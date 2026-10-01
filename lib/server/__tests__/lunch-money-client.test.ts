import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createApiKeyClient: vi.fn(),
  getConnectionCredential: vi.fn(),
}));

vi.mock("@/lib/lunchmoney/client", () => ({
  createApiKeyClient: mocks.createApiKeyClient,
}));
vi.mock("@/lib/server/connections", () => ({
  getConnectionCredential: mocks.getConnectionCredential,
}));

import { resolveLunchMoneyClient } from "@/lib/server/lunch-money-client";

beforeEach(() => vi.clearAllMocks());

describe("Lunch Money client resolution", () => {
  it("builds an API-key client only after resolving an owned credential", async () => {
    const client = { getMe: vi.fn() };
    mocks.getConnectionCredential.mockReturnValue({
      type: "api_key",
      token: "secret-token",
    });
    mocks.createApiKeyClient.mockReturnValue(client);

    expect(await resolveLunchMoneyClient("user-1", "connection-1")).toEqual({
      status: "ready",
      client,
    });
    expect(mocks.getConnectionCredential).toHaveBeenCalledWith(
      "user-1",
      "connection-1"
    );
    expect(mocks.createApiKeyClient).toHaveBeenCalledWith("secret-token");
  });

  it("does not create a client for a missing or unowned connection", async () => {
    mocks.getConnectionCredential.mockReturnValue(null);

    expect(await resolveLunchMoneyClient("user-1", "connection-2")).toEqual({
      status: "not_found",
    });
    expect(mocks.createApiKeyClient).not.toHaveBeenCalled();
  });

  it("keeps future OAuth credentials behind the resolver boundary", async () => {
    mocks.getConnectionCredential.mockReturnValue({
      type: "oauth",
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });

    expect(await resolveLunchMoneyClient("user-1", "connection-1")).toEqual({
      status: "unsupported_auth",
      authMethod: "oauth",
    });
    expect(mocks.createApiKeyClient).not.toHaveBeenCalled();
  });
});
