import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createApiKeyClient: vi.fn(),
  createOAuthClient: vi.fn(),
  getConnectionCredentialRecord: vi.fn(),
  claimOAuthRefresh: vi.fn(),
  replaceOAuthCredential: vi.fn(),
  refreshLunchMoneyTokens: vi.fn(),
}));

vi.mock("@/lib/lunchmoney/client", () => ({
  createApiKeyClient: mocks.createApiKeyClient,
  createOAuthClient: mocks.createOAuthClient,
}));
vi.mock("@/lib/server/connections", () => ({
  getConnectionCredentialRecord: mocks.getConnectionCredentialRecord,
  claimOAuthRefresh: mocks.claimOAuthRefresh,
  replaceOAuthCredential: mocks.replaceOAuthCredential,
}));
vi.mock("@/lib/server/lunch-money-oauth", () => ({
  lunchMoneyOAuthIssuer: () => "https://api-alpha.lunchmoney.dev",
  refreshLunchMoneyTokens: mocks.refreshLunchMoneyTokens,
}));

import {
  refreshOAuthConnection,
  resolveLunchMoneyClient,
} from "@/lib/server/lunch-money-client";

beforeEach(() => vi.clearAllMocks());

describe("Lunch Money client resolution", () => {
  it("builds an API-key client only after resolving an owned credential", async () => {
    const client = { getMe: vi.fn() };
    mocks.getConnectionCredentialRecord.mockResolvedValue({
      credential: { type: "api_key", token: "secret-token" },
      ciphertext: "encrypted",
    });
    mocks.createApiKeyClient.mockReturnValue(client);

    expect(await resolveLunchMoneyClient("user-1", "connection-1")).toEqual({
      status: "ready",
      client,
      authMethod: "api_key",
      ciphertext: "encrypted",
    });
    expect(mocks.getConnectionCredentialRecord).toHaveBeenCalledWith(
      "user-1",
      "connection-1"
    );
  });

  it("rejects a missing or unowned connection", async () => {
    mocks.getConnectionCredentialRecord.mockResolvedValue(null);
    expect(await resolveLunchMoneyClient("user-1", "connection-2")).toEqual({
      status: "not_found",
    });
    expect(mocks.createApiKeyClient).not.toHaveBeenCalled();
    expect(mocks.createOAuthClient).not.toHaveBeenCalled();
  });

  it("uses an unexpired OAuth token against the alpha API", async () => {
    const client = { getMe: vi.fn() };
    mocks.getConnectionCredentialRecord.mockResolvedValue({
      credential: {
        type: "oauth",
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: "2099-01-01T00:00:00.000Z",
      },
      ciphertext: "encrypted",
      externalUserId: "lm-user",
      refreshAttemptId: null,
    });
    mocks.createOAuthClient.mockReturnValue(client);

    expect(await resolveLunchMoneyClient("user-1", "connection-1")).toEqual({
      status: "ready",
      client,
      authMethod: "oauth",
      ciphertext: "encrypted",
    });
    expect(mocks.createOAuthClient).toHaveBeenCalledWith(
      "access-token",
      "https://api-alpha.lunchmoney.dev"
    );
  });

  it("replaces a rotated refresh token under a database claim", async () => {
    const original = {
      credential: {
        type: "oauth" as const,
        accessToken: "old-access",
        refreshToken: "old-refresh",
      },
      ciphertext: "old-encrypted",
      externalUserId: "lm-user",
      refreshAttemptId: null,
    };
    mocks.getConnectionCredentialRecord.mockResolvedValue(original);
    mocks.claimOAuthRefresh.mockResolvedValue(true);
    mocks.replaceOAuthCredential.mockResolvedValue(true);
    mocks.refreshLunchMoneyTokens.mockResolvedValue({
      access_token: "new-access",
      refresh_token: "new-refresh",
      expires_in: 3600,
      scope: "me:read offline_access",
    });

    const replacement = await refreshOAuthConnection(
      "user-1",
      "connection-1",
      original.ciphertext
    );
    expect(replacement).toMatchObject({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      scope: ["me:read", "offline_access"],
    });
    expect(mocks.replaceOAuthCredential).toHaveBeenCalledWith(
      "user-1",
      "connection-1",
      "old-encrypted",
      expect.any(String),
      replacement
    );
  });
});
