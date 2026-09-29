import "server-only";

import { createApiKeyClient, type LMClient } from "@/lib/lunchmoney/client";
import { getConnectionCredential } from "@/lib/server/connections";

type ConnectionClientResult =
  | { status: "ready"; client: LMClient }
  | { status: "not_found" }
  | { status: "unsupported_auth"; authMethod: "oauth" };

/**
 * The only place a stored Lunch Money credential becomes an API client.
 * OAuth token refresh and client construction belong in the OAuth branch when
 * Lunch Money publishes that contract; routes and browser code stay unchanged.
 */
export function resolveLunchMoneyClient(
  userId: string,
  connectionId: string
): ConnectionClientResult {
  const credential = getConnectionCredential(userId, connectionId);
  if (!credential) return { status: "not_found" };

  if (credential.type === "api_key") {
    return {
      status: "ready",
      client: createApiKeyClient(credential.token),
    };
  }

  return { status: "unsupported_auth", authMethod: credential.type };
}
