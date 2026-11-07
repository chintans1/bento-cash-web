import "server-only";

import { randomUUID } from "node:crypto";
import {
  createApiKeyClient,
  createOAuthClient,
  type LMClient,
} from "@/lib/lunchmoney/client";
import {
  claimOAuthRefresh,
  getConnectionCredentialRecord,
  replaceOAuthCredential,
  type ConnectionCredentialRecord,
} from "@/lib/server/connections";
import type { StoredCredential } from "@/lib/server/credential-crypto";
import {
  lunchMoneyOAuthIssuer,
  refreshLunchMoneyTokens,
} from "@/lib/server/lunch-money-oauth";

type OAuthCredential = Extract<StoredCredential, { type: "oauth" }>;

export class LunchMoneyReauthorizationRequired extends Error {
  constructor() {
    super("Reconnect this Lunch Money budget to continue.");
  }
}

type ConnectionClientResult =
  | {
      status: "ready";
      client: LMClient;
      authMethod: "api_key" | "oauth";
      ciphertext: string;
    }
  | { status: "not_found" }
  | { status: "reauthorization_required" };

function oauthCredential(record: ConnectionCredentialRecord): OAuthCredential {
  if (record.credential.type !== "oauth") {
    throw new LunchMoneyReauthorizationRequired();
  }
  return record.credential;
}

/**
 * A database compare-and-swap claims the rotating refresh token before use.
 * A lost response leaves the claim in place, so no worker replays that token.
 * Reauthorization replaces the credential and clears the claim.
 */
export async function refreshOAuthConnection(
  userId: string,
  connectionId: string,
  previousCiphertext?: string
): Promise<OAuthCredential> {
  for (let wait = 0; wait < 50; wait++) {
    const record = await getConnectionCredentialRecord(userId, connectionId);
    if (!record) throw new LunchMoneyReauthorizationRequired();
    const credential = oauthCredential(record);
    if (previousCiphertext && record.ciphertext !== previousCiphertext) {
      return credential;
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
      if (
        !(await replaceOAuthCredential(
          userId,
          connectionId,
          record.ciphertext,
          attemptId,
          replacement
        ))
      ) {
        throw new LunchMoneyReauthorizationRequired();
      }
      return replacement;
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
      ciphertext: record.ciphertext,
    };
  }

  if (!record.externalUserId) return { status: "reauthorization_required" };
  let credential = record.credential;
  let ciphertext = record.ciphertext;
  if (
    record.refreshAttemptId ||
    (credential.expiresAt &&
      new Date(credential.expiresAt).getTime() - Date.now() < 30_000)
  ) {
    try {
      credential = await refreshOAuthConnection(
        userId,
        connectionId,
        record.ciphertext
      );
      ciphertext =
        (await getConnectionCredentialRecord(userId, connectionId))
          ?.ciphertext ?? record.ciphertext;
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
