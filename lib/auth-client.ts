"use client";

import { createAuthClient } from "better-auth/react";
import { primaryIdentityProvider } from "@/lib/auth/identity-provider";

export const authClient = createAuthClient();

export function signInWithPrimaryIdentityProvider() {
  return authClient.signIn.social({
    provider: primaryIdentityProvider.id,
    callbackURL: "/",
  });
}
