/**
 * The product-facing identity provider contract.
 *
 * Lunch Money is the sole sign-in provider. The OAuth callback also connects
 * the selected budget to the Bento account.
 */
export const primaryIdentityProvider = {
  id: "lunch_money",
  name: "Lunch Money",
  signInLabel: "Continue with Lunch Money",
  pendingLabel: "Opening Lunch Money…",
  explanation:
    "We create your Bento Cash account on your first sign-in. Your budgets stay connected when you sign out.",
} as const;
