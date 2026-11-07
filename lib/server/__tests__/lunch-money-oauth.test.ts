import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLunchMoneyProfile } from "../lunch-money-oauth";

const originalIssuer = process.env.LUNCH_MONEY_OAUTH_ISSUER;
const profile = {
  id: 17,
  account_id: 42,
  email: "owner@example.com",
  name: "Owner",
  budget_name: "Home",
};

beforeEach(() => {
  process.env.LUNCH_MONEY_OAUTH_ISSUER = "https://api-alpha.lunchmoney.dev";
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalIssuer === undefined) delete process.env.LUNCH_MONEY_OAUTH_ISSUER;
  else process.env.LUNCH_MONEY_OAUTH_ISSUER = originalIssuer;
});

describe("Lunch Money OAuth profile", () => {
  it("reads and validates the selected budget from /v2/me", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(profile), { status: 200 })
      );
    vi.stubGlobal("fetch", fetchMock);

    expect(await getLunchMoneyProfile("access-token")).toEqual(profile);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api-alpha.lunchmoney.dev/v2/me",
      {
        headers: { Authorization: "Bearer access-token" },
        cache: "no-store",
      }
    );
  });

  it.each([
    { id: "17" },
    { account_id: "42" },
    { account_id: 0 },
    { budget_name: "   " },
  ])("rejects an invalid identity field: %j", async (change) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ...profile, ...change }), {
          status: 200,
        })
      )
    );

    await expect(getLunchMoneyProfile("access-token")).rejects.toThrow();
  });
});
