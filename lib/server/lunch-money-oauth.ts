import "server-only";

import { z } from "zod";

const profileSchema = z.object({
  id: z.int().positive(),
  account_id: z.int().positive(),
  email: z.email(),
  name: z.string(),
  budget_name: z.string().trim().min(1),
});

export type LunchMoneyOAuthProfile = z.infer<typeof profileSchema>;

export function lunchMoneyOAuthIssuer(): string {
  return (
    process.env.LUNCH_MONEY_OAUTH_ISSUER?.replace(/\/$/, "") ||
    "https://api.lunchmoney.dev"
  );
}

export async function getLunchMoneyProfile(
  accessToken: string
): Promise<LunchMoneyOAuthProfile> {
  const response = await fetch(`${lunchMoneyOAuthIssuer()}/v2/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Lunch Money identity check failed");
  return profileSchema.parse(await response.json());
}

export interface LunchMoneyTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: "Bearer";
}

const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  scope: z.string(),
  token_type: z.literal("Bearer"),
});

export async function refreshLunchMoneyTokens(
  refreshToken: string
): Promise<LunchMoneyTokenResponse> {
  const clientId = process.env.LUNCH_MONEY_CLIENT_ID;
  const clientSecret = process.env.LUNCH_MONEY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Lunch Money OAuth client credentials are missing");
  }

  const response = await fetch(`${lunchMoneyOAuthIssuer()}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Lunch Money authorization has expired");
  return tokenSchema.parse(await response.json());
}
