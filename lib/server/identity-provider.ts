import "server-only";

/**
 * Better Auth's provider adapter lives here so changing the primary identity
 * provider does not leak provider credentials or conditionals into app code.
 */
export function identityProviderOptions() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId && !clientSecret) return {};
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together"
    );
  }

  return { google: { clientId, clientSecret } };
}
