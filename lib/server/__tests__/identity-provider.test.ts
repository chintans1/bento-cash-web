import { afterEach, describe, expect, it } from "vitest";
import { identityProviderOptions } from "@/lib/server/identity-provider";

const originalClientId = process.env.GOOGLE_CLIENT_ID;
const originalClientSecret = process.env.GOOGLE_CLIENT_SECRET;

function restoreEnvironment() {
  if (originalClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
  else process.env.GOOGLE_CLIENT_ID = originalClientId;

  if (originalClientSecret === undefined)
    delete process.env.GOOGLE_CLIENT_SECRET;
  else process.env.GOOGLE_CLIENT_SECRET = originalClientSecret;
}

afterEach(restoreEnvironment);

describe("identity provider configuration", () => {
  it("leaves social sign-in disabled when Google is not configured", () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;

    expect(identityProviderOptions()).toEqual({});
  });

  it.each([
    ["client ID", "google-client-id", undefined],
    ["client secret", undefined, "google-client-secret"],
  ])("rejects a lone Google %s", (_, clientId, clientSecret) => {
    if (clientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = clientId;
    if (clientSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
    else process.env.GOOGLE_CLIENT_SECRET = clientSecret;

    expect(() => identityProviderOptions()).toThrow(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together"
    );
  });

  it("configures Google when both credentials are present", () => {
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";

    expect(identityProviderOptions()).toEqual({
      google: {
        clientId: "google-client-id",
        clientSecret: "google-client-secret",
      },
    });
  });
});
