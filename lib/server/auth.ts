import { betterAuth } from "better-auth";
import { authDatabase } from "@/lib/server/database";
import { identityProviderOptions } from "@/lib/server/identity-provider";

export async function getAuth() {
  return betterAuth({
    database: authDatabase,
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: {
      allowedHosts: [
        "localhost:3000",
        "bento-cash.chintan-cf.work",
        "bento-cash-web.chintans98.workers.dev",
        "bento-cash-web-oauth-test.chintans98.workers.dev",
        "*-bento-cash-web.chintans98.workers.dev",
      ],
    },
    emailAndPassword: {
      enabled: false,
    },
    account: {
      encryptOAuthTokens: true,
      // The database-backed strategy's state cookie lasts only five minutes.
      // Encrypted cookie state gives the full ten-minute OAuth consent window.
      storeStateStrategy: "cookie",
      accountLinking: {
        updateUserInfoOnLink: true,
      },
    },
    plugins: identityProviderOptions(),
  });
}
