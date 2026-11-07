import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestUser: vi.fn(),
  first: vi.fn(),
  getLunchMoneyProfile: vi.fn(),
  upsertOAuthConnection: vi.fn(),
  symmetricDecrypt: vi.fn(),
}));

vi.mock("@/lib/server/session", () => ({
  getRequestUser: mocks.getRequestUser,
}));
vi.mock("@/lib/server/database", () => ({
  getStore: async () => ({ first: mocks.first }),
}));
vi.mock("@/lib/server/lunch-money-oauth", () => ({
  getLunchMoneyProfile: mocks.getLunchMoneyProfile,
}));
vi.mock("@/lib/server/connections", () => ({
  upsertOAuthConnection: mocks.upsertOAuthConnection,
}));
vi.mock("better-auth/crypto", () => ({
  symmetricDecrypt: mocks.symmetricDecrypt,
}));

import { GET } from "@/app/api/oauth/lunch-money/complete/route";

const request = new Request(
  "http://localhost:3000/api/oauth/lunch-money/complete"
);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BETTER_AUTH_SECRET = "test-secret";
  mocks.getRequestUser.mockResolvedValue({
    id: "existing-google-user",
    email: "owner@example.com",
  });
  mocks.first.mockResolvedValue({
    accountId: "17",
    accessToken: "encrypted-access",
    refreshToken: "encrypted-refresh",
    accessTokenExpiresAt: "2099-01-01T00:00:00.000Z",
    scope: "me:read offline_access",
  });
  mocks.symmetricDecrypt.mockImplementation(
    async ({ data }: { data: string }) => data.replace("encrypted-", "")
  );
  mocks.getLunchMoneyProfile.mockResolvedValue({
    id: 17,
    account_id: 42,
    email: "owner@example.com",
    name: "Owner",
    budget_name: "Home",
  });
});

describe("Lunch Money OAuth completion", () => {
  it("connects the selected budget to the existing same-email Bento user", async () => {
    const response = await GET(request);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
    expect(mocks.upsertOAuthConnection).toHaveBeenCalledWith(
      "existing-google-user",
      {
        type: "oauth",
        accessToken: "access",
        refreshToken: "refresh",
        expiresAt: "2099-01-01T00:00:00.000Z",
        scope: ["me:read", "offline_access"],
      },
      {
        name: "Owner",
        budgetName: "Home",
        email: "owner@example.com",
        externalAccountId: 42,
        externalUserId: 17,
      }
    );
  });

  it("refuses a different Lunch Money email or user ID", async () => {
    mocks.getLunchMoneyProfile.mockResolvedValueOnce({
      id: 17,
      account_id: 42,
      email: "different@example.com",
      name: "Other",
      budget_name: "Home",
    });
    const response = await GET(request);
    expect(response.headers.get("location")).toContain(
      "error=oauth_identity_mismatch"
    );
    expect(mocks.upsertOAuthConnection).not.toHaveBeenCalled();

    mocks.getLunchMoneyProfile.mockResolvedValueOnce({
      id: 18,
      account_id: 42,
      email: "owner@example.com",
      name: "Other",
      budget_name: "Home",
    });
    const second = await GET(request);
    expect(second.headers.get("location")).toContain(
      "error=oauth_identity_mismatch"
    );
    expect(mocks.upsertOAuthConnection).not.toHaveBeenCalled();
  });

  it("requires a Bento session", async () => {
    mocks.getRequestUser.mockResolvedValue(null);
    const response = await GET(request);
    expect(response.headers.get("location")).toContain(
      "error=oauth_connection_failed"
    );
    expect(mocks.first).not.toHaveBeenCalled();
  });
});
