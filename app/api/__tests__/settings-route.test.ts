import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestUser: vi.fn(),
  hasSameOrigin: vi.fn(),
  getFeatureSetting: vi.fn(),
  ownsConnection: vi.fn(),
  setFeatureSetting: vi.fn(),
}));

vi.mock("@/lib/server/session", () => ({
  getRequestUser: mocks.getRequestUser,
  hasSameOrigin: mocks.hasSameOrigin,
}));
vi.mock("@/lib/server/feature-settings", () => ({
  getFeatureSetting: mocks.getFeatureSetting,
  ownsConnection: mocks.ownsConnection,
  setFeatureSetting: mocks.setFeatureSetting,
}));

import { GET, PUT } from "@/app/api/settings/[key]/route";

const context = { params: Promise.resolve({ key: "months" }) };

function request(method = "GET", body?: unknown, connection = "connection-1") {
  return new Request(
    `https://bento.example/api/settings/months?connectionId=${connection}`,
    {
      method,
      headers: {
        origin: "https://bento.example",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getRequestUser.mockResolvedValue({ id: "user-1" });
  mocks.hasSameOrigin.mockReturnValue(true);
  mocks.ownsConnection.mockReturnValue(true);
  mocks.setFeatureSetting.mockReturnValue(true);
});

describe("user/account-scoped settings", () => {
  it("requires a session before reading settings", async () => {
    mocks.getRequestUser.mockResolvedValue(null);

    const response = await GET(request(), context);

    expect(response.status).toBe(401);
    expect(mocks.getFeatureSetting).not.toHaveBeenCalled();
  });

  it("does not reveal settings for another user's connection", async () => {
    mocks.ownsConnection.mockReturnValue(false);

    const response = await GET(request(), context);

    expect(response.status).toBe(404);
    expect(mocks.getFeatureSetting).not.toHaveBeenCalled();
  });

  it("reads a setting for the authenticated user/account pair", async () => {
    mocks.getFeatureSetting.mockReturnValue("6");

    const response = await GET(request(), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ value: "6" });
    expect(mocks.getFeatureSetting).toHaveBeenCalledWith(
      "user-1",
      "connection-1",
      "months"
    );
  });

  it("rejects cross-origin setting mutations", async () => {
    mocks.hasSameOrigin.mockReturnValue(false);

    const response = await PUT(request("PUT", { value: "6" }), context);

    expect(response.status).toBe(403);
    expect(mocks.getRequestUser).not.toHaveBeenCalled();
  });

  it("does not write settings for another user's connection", async () => {
    mocks.setFeatureSetting.mockReturnValue(false);

    const response = await PUT(request("PUT", { value: "6" }), context);

    expect(response.status).toBe(404);
    expect(mocks.setFeatureSetting).toHaveBeenCalledWith(
      "user-1",
      "connection-1",
      "months",
      "6"
    );
  });

  it("writes a setting for the authenticated user/account pair", async () => {
    const response = await PUT(request("PUT", { value: "6" }), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("rejects invalid setting keys", async () => {
    const response = await PUT(request("PUT", { value: "6" }), {
      params: Promise.resolve({ key: "not-valid!" }),
    });

    expect(response.status).toBe(400);
    expect(mocks.setFeatureSetting).not.toHaveBeenCalled();
  });
});
