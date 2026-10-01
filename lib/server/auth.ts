import { betterAuth } from "better-auth";
import { authDatabase } from "@/lib/server/database";
import { identityProviderOptions } from "@/lib/server/identity-provider";

export async function getAuth() {
  return betterAuth({
    database: authDatabase,
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
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
