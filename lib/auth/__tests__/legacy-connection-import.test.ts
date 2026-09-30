import { beforeEach, describe, expect, it, vi } from "vitest";
import { importLegacyConnections } from "@/lib/auth/legacy-connection-import";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  });
  vi.stubGlobal("fetch", vi.fn());
});

describe("legacy connection import", () => {
  it("deduplicates old tokens and clears browser credentials after import", async () => {
    localStorage.setItem(
      "bento_auth_v1",
      JSON.stringify({
        accounts: [
          { credential: { type: "api_key", token: "token-a" } },
          { credential: { type: "api_key", token: "token-a" } },
          { credential: { type: "oauth", token: "not-an-api-key" } },
        ],
      })
    );
    localStorage.setItem("lm_token", "token-b");
    localStorage.setItem("lm_demo", "true");
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({ account: { id: "connection-a" } }, 201)
      )
      .mockResolvedValueOnce(
        jsonResponse({ account: { id: "connection-b" } }, 201)
      );

    const imported = await importLegacyConnections();

    expect(imported).toEqual([{ id: "connection-a" }, { id: "connection-b" }]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/api/connections",
      expect.objectContaining({ body: JSON.stringify({ token: "token-a" }) })
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/connections",
      expect.objectContaining({ body: JSON.stringify({ token: "token-b" }) })
    );
    expect(localStorage.removeItem).toHaveBeenCalledWith("bento_auth_v1");
    expect(localStorage.removeItem).toHaveBeenCalledWith("lm_token");
    expect(localStorage.removeItem).toHaveBeenCalledWith("lm_demo");
  });

  it("retains local credentials when any import fails", async () => {
    localStorage.setItem(
      "bento_auth_v1",
      JSON.stringify({
        accounts: [{ credential: { type: "api_key", token: "token-a" } }],
      })
    );
    localStorage.setItem("lm_token", "token-b");
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({ account: { id: "connection-a" } }, 201)
      )
      .mockResolvedValueOnce(jsonResponse({ error: "Invalid API key" }, 400));

    await expect(importLegacyConnections()).resolves.toEqual([
      { id: "connection-a" },
    ]);
    expect(localStorage.removeItem).not.toHaveBeenCalled();
  });

  it("ignores corrupt legacy state when there is nothing to import", async () => {
    localStorage.setItem("bento_auth_v1", "not-json");

    await expect(importLegacyConnections()).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
});
