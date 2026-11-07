import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
  handler: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  getAuth: mocks.getAuth,
}));

import { GET, POST } from "@/app/api/auth/[...all]/route";

describe("auth route", () => {
  it.each([
    [GET, "GET", "account-info"],
    [POST, "POST", "get-access-token"],
    [POST, "POST", "refresh-token"],
    [POST, "POST", "%67et-access-token/"],
  ])("blocks token-bearing endpoint %s %s %s", async (route, method, path) => {
    const response = await route(
      new Request(`https://bento.example/api/auth/${path}`, { method })
    );

    expect(response.status).toBe(404);
    expect(mocks.getAuth).not.toHaveBeenCalled();
  });

  it("passes sign-in requests to Better Auth", async () => {
    const response = new Response(null, { status: 200 });
    mocks.handler.mockResolvedValue(response);
    mocks.getAuth.mockResolvedValue({ handler: mocks.handler });
    const request = new Request(
      "https://bento.example/api/auth/sign-in/social",
      { method: "POST" }
    );

    await expect(POST(request)).resolves.toBe(response);
    expect(mocks.handler).toHaveBeenCalledWith(request);
  });
});
