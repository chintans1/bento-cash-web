/**
 * The product-facing identity provider contract.
 *
 * When Lunch Money OAuth is available, this is the single client-side switch:
 * update the provider metadata and keep the rest of onboarding provider-agnostic.
 */
export const primaryIdentityProvider = {
  id: "google",
  name: "Google",
  signInLabel: "Continue with Google",
  pendingLabel: "Opening Google…",
  explanation:
    "No password to create. Google is used only to identify your Bento Cash account.",
} as const;

export type IdentityProviderId = typeof primaryIdentityProvider.id;
