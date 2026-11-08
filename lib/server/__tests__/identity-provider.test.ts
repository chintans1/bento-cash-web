import { afterEach, describe, expect, it } from "vitest";
import { identityProviderOptions } from "@/lib/server/identity-provider";

const originalClientId = process.env.LUNCH_MONEY_CLIENT_ID;
const originalClientSecret = process.env.LUNCH_MONEY_CLIENT_SECRET;
const originalIssuer = process.env.LUNCH_MONEY_OAUTH_ISSUER;

afterEach(() => {
  if (originalClientId === undefined) delete process.env.LUNCH_MONEY_CLIENT_ID;
  else process.env.LUNCH_MONEY_CLIENT_ID = originalClientId;
  if (originalClientSecret === undefined)
    delete process.env.LUNCH_MONEY_CLIENT_SECRET;
  else process.env.LUNCH_MONEY_CLIENT_SECRET = originalClientSecret;
  if (originalIssuer === undefined) delete process.env.LUNCH_MONEY_OAUTH_ISSUER;
  else process.env.LUNCH_MONEY_OAUTH_ISSUER = originalIssuer;
});

describe("Lunch Money identity provider configuration", () => {
  it("disables OAuth when client credentials are absent", () => {
    delete process.env.LUNCH_MONEY_CLIENT_ID;
    delete process.env.LUNCH_MONEY_CLIENT_SECRET;
    expect(identityProviderOptions()).toEqual([]);
  });

  it.each([
    ["client ID", "client-id", undefined],
    ["client secret", undefined, "client-secret"],
  ])("rejects a lone %s", (_, clientId, clientSecret) => {
    if (clientId === undefined) delete process.env.LUNCH_MONEY_CLIENT_ID;
    else process.env.LUNCH_MONEY_CLIENT_ID = clientId;
    if (clientSecret === undefined)
      delete process.env.LUNCH_MONEY_CLIENT_SECRET;
    else process.env.LUNCH_MONEY_CLIENT_SECRET = clientSecret;
    expect(() => identityProviderOptions()).toThrow(
      "LUNCH_MONEY_CLIENT_ID and LUNCH_MONEY_CLIENT_SECRET must be configured together"
    );
  });

  it("uses the alpha issuer, PKCE, and HTTP Basic token authentication", () => {
    process.env.LUNCH_MONEY_CLIENT_ID = "client-id";
    process.env.LUNCH_MONEY_CLIENT_SECRET = "client-secret";
    process.env.LUNCH_MONEY_OAUTH_ISSUER = "https://api-alpha.lunchmoney.dev/";

    const [plugin] = identityProviderOptions();
    expect(plugin?.options.config[0]).toMatchObject({
      providerId: "lunch_money",
      clientId: "client-id",
      clientSecret: "client-secret",
      discoveryUrl:
        "https://api-alpha.lunchmoney.dev/.well-known/oauth-authorization-server",
      tokenEndpointAuth: { method: "client_secret_basic" },
      pkce: true,
    });
  });
});
