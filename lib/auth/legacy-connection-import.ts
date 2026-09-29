"use client";

import type { LunchMoneyConnection } from "@/lib/lunchmoney/connection-types";

const LEGACY_AUTH_KEY = "bento_auth_v1";
const LEGACY_TOKEN_KEY = "lm_token";

interface ConnectionCreatedResponse {
  account: LunchMoneyConnection;
}

async function importToken(token: string): Promise<LunchMoneyConnection> {
  const response = await fetch("/api/connections", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const payload = (await response.json().catch(() => null)) as
    | (ConnectionCreatedResponse & { error?: string })
    | null;
  if (!response.ok || !payload?.account) {
    throw new Error(payload?.error ?? "Import failed");
  }
  return payload.account;
}

function readLegacyTokens(): string[] {
  const tokens: string[] = [];
  const raw = localStorage.getItem(LEGACY_AUTH_KEY);

  if (raw) {
    try {
      const state = JSON.parse(raw) as {
        accounts?: Array<{ credential?: { type?: string; token?: unknown } }>;
      };
      for (const account of state.accounts ?? []) {
        if (
          account.credential?.type === "api_key" &&
          typeof account.credential.token === "string"
        ) {
          tokens.push(account.credential.token);
        }
      }
    } catch {
      // Ignore corrupt legacy state; normal signed-in loading can continue.
    }
  }

  const singleToken = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (singleToken) tokens.push(singleToken);
  return [...new Set(tokens)];
}

/** Moves browser-local credentials into encrypted, user-owned server rows. */
export async function importLegacyConnections(): Promise<
  LunchMoneyConnection[]
> {
  const tokens = readLegacyTokens();
  if (tokens.length === 0) return [];

  const results = await Promise.allSettled(tokens.map(importToken));
  if (results.every((result) => result.status === "fulfilled")) {
    localStorage.removeItem(LEGACY_AUTH_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem("lm_demo");
  }

  return results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : []
  );
}
