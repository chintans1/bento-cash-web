/**
 * The product-facing identity provider contract.
 *
 * Lunch Money is the sole sign-in provider. The OAuth callback also connects
 * the selected budget to the Bento account.
 */
export const primaryIdentityProvider = {
  id: "lunch_money",
  name: "Lunch Money",
  explanation:
    "Your Bento Cash account is created on first sign-in. Choose a budget on Lunch Money to get started.",
} as const;
