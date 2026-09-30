import { describe, expect, it, vi } from "vitest";

const social = vi.hoisted(() => vi.fn());

vi.mock("better-auth/react", () => ({
  createAuthClient: () => ({
    signIn: { social },
  }),
}));

import { signInWithPrimaryIdentityProvider } from "@/lib/auth-client";

describe("primary identity sign-in", () => {
  it("starts Google OAuth and returns to the app", async () => {
    social.mockResolvedValue({ data: null, error: null });

    await signInWithPrimaryIdentityProvider();

    expect(social).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "/",
    });
  });
});
