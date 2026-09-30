import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  betterAuth: vi.fn((options: unknown) => ({ options })),
  identityProviderOptions: vi.fn(() => ({
    google: { clientId: "client", clientSecret: "secret" },
  })),
}));

vi.mock("better-auth", () => ({ betterAuth: mocks.betterAuth }));
vi.mock("@/lib/server/database", () => ({ database: { test: true } }));
vi.mock("@/lib/server/identity-provider", () => ({
  identityProviderOptions: mocks.identityProviderOptions,
}));

describe("Better Auth configuration", () => {
  it("uses provider-only identity and preserves account linking metadata", async () => {
    await import("@/lib/server/auth");

    expect(mocks.betterAuth).toHaveBeenCalledOnce();
    expect(mocks.betterAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAndPassword: { enabled: false },
        account: { accountLinking: { updateUserInfoOnLink: true } },
        socialProviders: {
          google: { clientId: "client", clientSecret: "secret" },
        },
      })
    );
  });
});
