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
        "*-bento-cash-web.chintans98.workers.dev",
      ],
    },
    emailAndPassword: {
      enabled: false,
    },
    account: {
      accountLinking: {
        updateUserInfoOnLink: true,
      },
    },
    socialProviders: identityProviderOptions(),
  });
}
