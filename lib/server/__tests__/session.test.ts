import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/auth", () => ({
  auth: { api: { getSession } },
}));

import { getRequestUser, hasSameOrigin } from "@/lib/server/session";

const originalAuthUrl = process.env.BETTER_AUTH_URL;

beforeEach(() => {
  getSession.mockReset();
  delete process.env.BETTER_AUTH_URL;
});

afterEach(() => {
  if (originalAuthUrl === undefined) delete process.env.BETTER_AUTH_URL;
  else process.env.BETTER_AUTH_URL = originalAuthUrl;
});

describe("request authentication", () => {
  it("returns the authenticated Better Auth user", async () => {
    const user = { id: "user-1", name: "User", email: "user@example.com" };
    getSession.mockResolvedValue({ user, session: { id: "session-1" } });
    const request = new Request("https://bento.example/api/connections", {
      headers: { cookie: "better-auth.session_token=token" },
    });

    await expect(getRequestUser(request)).resolves.toEqual(user);
    expect(getSession).toHaveBeenCalledWith({ headers: request.headers });
  });

  it("returns null without a valid session", async () => {
    getSession.mockResolvedValue(null);

    await expect(
      getRequestUser(new Request("https://bento.example/api/connections"))
    ).resolves.toBeNull();
  });
});

describe("same-origin mutation protection", () => {
  it("accepts the request URL origin", () => {
    const request = new Request("https://bento.example/api/connections", {
      headers: { origin: "https://bento.example" },
    });

    expect(hasSameOrigin(request)).toBe(true);
  });

  it("accepts the configured auth origin behind a proxy", () => {
    process.env.BETTER_AUTH_URL = "https://auth.bento.example/base/path";
    const request = new Request("http://internal:3000/api/connections", {
      headers: { origin: "https://auth.bento.example" },
    });

    expect(hasSameOrigin(request)).toBe(true);
  });

  it.each([undefined, "https://attacker.example"])(
    "rejects an absent or foreign origin (%s)",
    (origin) => {
      const headers = origin ? { origin } : undefined;
      const request = new Request("https://bento.example/api/connections", {
        headers,
      });

      expect(hasSameOrigin(request)).toBe(false);
    }
  );
});
