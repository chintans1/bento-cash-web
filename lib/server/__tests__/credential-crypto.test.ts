import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decryptCredential,
  encryptCredential,
  type StoredCredential,
} from "@/lib/server/credential-crypto";

const originalCredentialKey = process.env.BENTO_CREDENTIAL_ENCRYPTION_KEY;
const originalAuthSecret = process.env.BETTER_AUTH_SECRET;

afterEach(() => {
  if (originalCredentialKey === undefined)
    delete process.env.BENTO_CREDENTIAL_ENCRYPTION_KEY;
  else process.env.BENTO_CREDENTIAL_ENCRYPTION_KEY = originalCredentialKey;

  if (originalAuthSecret === undefined) delete process.env.BETTER_AUTH_SECRET;
  else process.env.BETTER_AUTH_SECRET = originalAuthSecret;

  vi.unstubAllEnvs();
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

  it("round-trips future OAuth credentials without exposing their contents", () => {
    process.env.BENTO_CREDENTIAL_ENCRYPTION_KEY = "credential-test-secret";
    const credential: StoredCredential = {
      type: "oauth",
      accessToken: "oauth-access-token",
      refreshToken: "oauth-refresh-token",
      expiresAt: "2030-01-01T00:00:00.000Z",
      scope: ["read", "write"],
    };

    const encrypted = encryptCredential(credential);

    expect(encrypted).toMatch(/^v1\./);
    expect(encrypted).not.toContain("oauth-access-token");
    expect(encrypted).not.toContain("oauth-refresh-token");
    expect(decryptCredential(encrypted)).toEqual(credential);
  });

  it("rejects ciphertext that has been tampered with", () => {
    process.env.BENTO_CREDENTIAL_ENCRYPTION_KEY = "credential-test-secret";
    const encrypted = encryptCredential({
      type: "api_key",
      token: "lunch-money-token",
    });
    const parts = encrypted.split(".");
    parts[3] = `${parts[3].startsWith("A") ? "B" : "A"}${parts[3].slice(1)}`;
    const tampered = parts.join(".");

    expect(() => decryptCredential(tampered)).toThrow();
  });

  it("requires an explicit secret in production", () => {
    delete process.env.BENTO_CREDENTIAL_ENCRYPTION_KEY;
    delete process.env.BETTER_AUTH_SECRET;
    vi.stubEnv("NODE_ENV", "production");

    expect(() =>
      encryptCredential({ type: "api_key", token: "lunch-money-token" })
    ).toThrow(
      "BENTO_CREDENTIAL_ENCRYPTION_KEY or BETTER_AUTH_SECRET is required"
    );
  });
});
