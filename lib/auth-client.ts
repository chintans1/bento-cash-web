"use client";

import { createAuthClient } from "better-auth/react";
import { primaryIdentityProvider } from "@/lib/auth/identity-provider";

export const authClient = createAuthClient();

export async function signInWithPrimaryIdentityProvider() {
  const result = await authClient.signIn.social({
    provider: primaryIdentityProvider.id,
    callbackURL: "/api/oauth/lunch-money/complete",
    errorCallbackURL: "/",
  });
  if (result.error) throw new Error(result.error.message);
}
