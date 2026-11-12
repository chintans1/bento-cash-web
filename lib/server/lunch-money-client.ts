import "server-only";

import { randomUUID } from "node:crypto";
import {
  createApiKeyClient,
  createOAuthClient,
  type ServerLMClient,
} from "@/lib/lunchmoney/client";
import {
  claimOAuthRefresh,
  getConnectionCredentialRecord,
  replaceOAuthCredential,
} from "@/lib/server/connections";
import type { StoredCredential } from "@/lib/server/credential-crypto";
import {
  lunchMoneyOAuthIssuer,
  refreshLunchMoneyTokens,
} from "@/lib/server/lunch-money-oauth";

type OAuthCredential = Extract<StoredCredential, { type: "oauth" }>;
type RefreshedCredential = { credential: OAuthCredential; ciphertext: string };

export class LunchMoneyReauthorizationRequired extends Error {
  constructor() {
    super("Reconnect this Lunch Money budget to continue.");
  }
}

type ConnectionClientResult =
  | {
      status: "ready";
      client: ServerLMClient;
      authMethod: "api_key";
    }
  | {
      status: "ready";
      client: ServerLMClient;
      authMethod: "oauth";
      ciphertext: string;
    }
  | { status: "not_found" }
  | { status: "reauthorization_required" };

/**
 * A database compare-and-swap claims the rotating refresh token before use.
 * A lost response leaves the claim in place, so no worker replays that token.
 * Reauthorization replaces the credential and clears the claim.
 */
export async function refreshOAuthConnection(
  userId: string,
  connectionId: string,
  previousCiphertext?: string
): Promise<RefreshedCredential> {
  for (let wait = 0; wait < 50; wait++) {
    const record = await getConnectionCredentialRecord(userId, connectionId);
    if (!record) throw new LunchMoneyReauthorizationRequired();
    const credential = record.credential;
    if (credential.type !== "oauth") {
      throw new LunchMoneyReauthorizationRequired();
    }
    if (previousCiphertext && record.ciphertext !== previousCiphertext) {
      return { credential, ciphertext: record.ciphertext };
    }
    if (record.refreshAttemptId) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      continue;
    }
    if (!credential.refreshToken) throw new LunchMoneyReauthorizationRequired();

    const attemptId = randomUUID();
    if (
      !(await claimOAuthRefresh(
        userId,
        connectionId,
        record.ciphertext,
        attemptId
      ))
    ) {
      continue;
    }

    try {
      const tokens = await refreshLunchMoneyTokens(credential.refreshToken);
      const replacement: OAuthCredential = {
        type: "oauth",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(
          Date.now() + tokens.expires_in * 1000
        ).toISOString(),
        scope: tokens.scope.split(/\s+/).filter(Boolean),
      };
      const ciphertext = await replaceOAuthCredential(
        userId,
        connectionId,
        record.ciphertext,
        attemptId,
        replacement
      );
      if (!ciphertext) {
        throw new LunchMoneyReauthorizationRequired();
      }
      return { credential: replacement, ciphertext };
    } catch {
      // The server may have consumed the old refresh token. Never retry it.
      throw new LunchMoneyReauthorizationRequired();
    }
  }
  throw new LunchMoneyReauthorizationRequired();
}

export async function resolveLunchMoneyClient(
  userId: string,
  connectionId: string
): Promise<ConnectionClientResult> {
  const record = await getConnectionCredentialRecord(userId, connectionId);
  if (!record) return { status: "not_found" };

  if (record.credential.type === "api_key") {
    return {
      status: "ready",
      client: createApiKeyClient(record.credential.token),
      authMethod: "api_key",
    };
  }

  let credential = record.credential;
  let ciphertext = record.ciphertext;
  if (
    record.refreshAttemptId ||
    (credential.expiresAt &&
      new Date(credential.expiresAt).getTime() - Date.now() < 30_000)
  ) {
    try {
      const refreshed = await refreshOAuthConnection(
        userId,
        connectionId,
        record.ciphertext
      );
      credential = refreshed.credential;
      ciphertext = refreshed.ciphertext;
    } catch {
      return { status: "reauthorization_required" };
    }
  }

  return {
    status: "ready",
    client: createOAuthClient(credential.accessToken, lunchMoneyOAuthIssuer()),
    authMethod: "oauth",
    ciphertext,
  };
}
