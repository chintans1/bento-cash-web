import "server-only";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import {
  getLunchMoneyProfile,
  lunchMoneyOAuthIssuer,
} from "@/lib/server/lunch-money-oauth";

/**
 * Better Auth's provider adapter lives here so changing the primary identity
 * provider does not leak provider credentials or conditionals into app code.
 */
export function identityProviderOptions() {
  const clientId = process.env.LUNCH_MONEY_CLIENT_ID;
  const clientSecret = process.env.LUNCH_MONEY_CLIENT_SECRET;

  if (!clientId && !clientSecret) return [];
  if (!clientId || !clientSecret) {
    throw new Error(
      "LUNCH_MONEY_CLIENT_ID and LUNCH_MONEY_CLIENT_SECRET must be configured together"
    );
  }

  const issuer = lunchMoneyOAuthIssuer();
  return [
    genericOAuth({
      config: [
        {
          providerId: "lunch_money",
          name: "Lunch Money",
          clientId,
          clientSecret,
          discoveryUrl: `${issuer}/.well-known/oauth-authorization-server`,
          authorizationUrl: `${issuer}/oauth/authorize`,
          tokenUrl: `${issuer}/oauth/token`,
          tokenEndpointAuth: { method: "client_secret_basic" },
          pkce: true,
          accountSubject: ({ profile }) => String(profile.id),
          getUserInfo: async ({ accessToken }) => {
            if (!accessToken) return null;
            const profile = await getLunchMoneyProfile(accessToken);
            return {
              ...profile,
              id: String(profile.id),
              email: profile.email.toLowerCase(),
              // /v2/me is returned for an authenticated Lunch Money user.
              // Its email is the identity proof used to match an existing
              // verified Google-backed Bento account.
              emailVerified: true,
            };
          },
        },
      ],
    }),
  ];
}
