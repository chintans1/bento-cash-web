import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestUser: vi.fn(),
  hasSameOrigin: vi.fn(),
  listConnections: vi.fn(),
  removeConnection: vi.fn(),
  setActiveConnection: vi.fn(),
}));

vi.mock("@/lib/server/session", () => ({
  getRequestUser: mocks.getRequestUser,
  hasSameOrigin: mocks.hasSameOrigin,
}));
vi.mock("@/lib/server/connections", () => ({
  listConnections: mocks.listConnections,
  removeConnection: mocks.removeConnection,
  setActiveConnection: mocks.setActiveConnection,
}));

import { GET as list } from "@/app/api/connections/route";
import {
  DELETE as remove,
  PATCH as select,
} from "@/app/api/connections/[id]/route";

const user = { id: "user-1", name: "User", email: "user@example.com" };
const state = {
  connections: [{ id: "connection-1", label: "Personal" }],
  activeConnectionId: "connection-1",
};

function request(path = "/api/connections", method = "GET") {
  return new Request(`https://bento.example${path}`, {
    method,
    headers: { origin: "https://bento.example" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.hasSameOrigin.mockReturnValue(true);
  mocks.getRequestUser.mockResolvedValue(user);
  mocks.listConnections.mockReturnValue(state);
});

describe("connections collection route", () => {
  it("requires a session before listing connections", async () => {
    mocks.getRequestUser.mockResolvedValue(null);

    const response = await list(request());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mocks.listConnections).not.toHaveBeenCalled();
  });

  it("lists only the authenticated user's connections", async () => {
    const response = await list(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(state);
    expect(mocks.listConnections).toHaveBeenCalledWith("user-1");
  });
});

describe("individual connection route", () => {
  const context = { params: Promise.resolve({ id: "connection-1" }) };

  it.each([
    ["select", select, "PATCH"],
    ["remove", remove, "DELETE"],
  ] as const)(
    "rejects cross-origin %s mutations",
    async (_, handler, method) => {
      mocks.hasSameOrigin.mockReturnValue(false);

      const response = await handler(
        request("/api/connections/connection-1", method),
        context
      );

      expect(response.status).toBe(403);
      expect(mocks.getRequestUser).not.toHaveBeenCalled();
    }
  );

  it("returns 404 when selecting another user's connection", async () => {
    mocks.setActiveConnection.mockReturnValue(false);

    const response = await select(
      request("/api/connections/connection-1", "PATCH"),
      context
    );

    expect(response.status).toBe(404);
    expect(mocks.setActiveConnection).toHaveBeenCalledWith(
      "user-1",
      "connection-1"
    );
  });

  it("selects an owned connection", async () => {
    mocks.setActiveConnection.mockReturnValue(true);

    const response = await select(
      request("/api/connections/connection-1", "PATCH"),
      context
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      activeConnectionId: "connection-1",
    });
  });

  it("returns 404 when removing another user's connection", async () => {
    mocks.removeConnection.mockReturnValue(false);

    const response = await remove(
      request("/api/connections/connection-1", "DELETE"),
      context
    );

    expect(response.status).toBe(404);
    expect(mocks.removeConnection).toHaveBeenCalledWith(
      "user-1",
      "connection-1"
    );
  });

  it("removes an owned connection and returns the next active state", async () => {
    mocks.removeConnection.mockReturnValue(true);

    const response = await remove(
      request("/api/connections/connection-1", "DELETE"),
      context
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(state);
    expect(mocks.listConnections).toHaveBeenCalledWith("user-1");
  });
});
