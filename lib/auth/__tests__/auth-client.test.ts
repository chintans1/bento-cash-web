import { describe, expect, it, vi } from "vitest";

const social = vi.hoisted(() => vi.fn());

vi.mock("better-auth/react", () => ({
  createAuthClient: () => ({
    signIn: { social },
  }),
}));

import { signInWithPrimaryIdentityProvider } from "@/lib/auth-client";

describe("primary identity sign-in", () => {
  it("starts Lunch Money OAuth and completes the budget connection", async () => {
    social.mockResolvedValue({ data: null, error: null });

    await signInWithPrimaryIdentityProvider();

    expect(social).toHaveBeenCalledWith({
      provider: "lunch_money",
      callbackURL: "/api/oauth/lunch-money/complete",
      errorCallbackURL: "/",
    });
  });

  it("reports provider errors to the sign-in screen", async () => {
    social.mockResolvedValue({
      data: null,
      error: { message: "OAuth failed" },
    });

    await expect(signInWithPrimaryIdentityProvider()).rejects.toThrow(
      "OAuth failed"
    );
  });
});
