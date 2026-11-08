import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
  handler: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  getAuth: mocks.getAuth,
}));

import { POST } from "@/app/api/auth/[...all]/route";

describe("auth route", () => {
  it.each(["get-access-token", "refresh-token", "%67et-access-token/"])(
    "blocks token endpoint %s",
    async (path) => {
      const response = await POST(
        new Request(`https://bento.example/api/auth/${path}`, {
          method: "POST",
        })
      );

      expect(response.status).toBe(404);
      expect(mocks.getAuth).not.toHaveBeenCalled();
    }
  );

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
