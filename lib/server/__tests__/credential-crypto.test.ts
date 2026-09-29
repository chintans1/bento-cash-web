import { afterEach, describe, expect, it } from "vitest";
import {
  decryptCredential,
  encryptCredential,
} from "@/lib/server/credential-crypto";

const originalCredentialKey = process.env.BENTO_CREDENTIAL_ENCRYPTION_KEY;
const originalAuthSecret = process.env.BETTER_AUTH_SECRET;

afterEach(() => {
  if (originalCredentialKey === undefined)
    delete process.env.BENTO_CREDENTIAL_ENCRYPTION_KEY;
  else process.env.BENTO_CREDENTIAL_ENCRYPTION_KEY = originalCredentialKey;

  if (originalAuthSecret === undefined) delete process.env.BETTER_AUTH_SECRET;
  else process.env.BETTER_AUTH_SECRET = originalAuthSecret;
});

describe("credential encryption key selection", () => {
  it("falls back to Better Auth when the optional key is blank", () => {
    process.env.BENTO_CREDENTIAL_ENCRYPTION_KEY = "   ";
    process.env.BETTER_AUTH_SECRET = "better-auth-test-secret";
    const credential = { type: "api_key", token: "lunch-money-token" } as const;

    expect(decryptCredential(encryptCredential(credential))).toEqual(
      credential
    );
  });
});
