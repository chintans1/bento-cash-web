import { symmetricDecrypt } from "better-auth/crypto";
import { getStore } from "@/lib/server/database";
import { upsertOAuthConnection } from "@/lib/server/connections";
import { getLunchMoneyProfile } from "@/lib/server/lunch-money-oauth";
import { getRequestUser } from "@/lib/server/session";

interface OAuthAccountRow {
  accountId: string;
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: string | number | null;
  scope: string | null;
}

function redirect(request: Request, error?: string): Response {
  const target = new URL("/", request.url);
  if (error) target.searchParams.set("error", error);
  return Response.redirect(target, 303);
}

async function decryptToken(value: string | null): Promise<string | undefined> {
  if (!value) return undefined;
  const key = process.env.BETTER_AUTH_SECRET;
  if (!key) throw new Error("Better Auth secret is missing");
  return symmetricDecrypt({ key, data: value });
}

/** Better Auth has established the Bento session before redirecting here. */
export async function GET(request: Request): Promise<Response> {
  const user = await getRequestUser(request);
  if (!user) return redirect(request, "oauth_connection_failed");

  try {
    const store = await getStore();
    const account = await store.first<OAuthAccountRow>(
      `select "accountId", "accessToken", "refreshToken", "accessTokenExpiresAt", "scope"
         from "account" where "userId" = ? and "providerId" = 'lunch_money'
         order by "updatedAt" desc limit 1`,
      [user.id]
    );
    if (!account?.accessToken)
      return redirect(request, "oauth_connection_failed");

    const accessToken = await decryptToken(account.accessToken);
    const refreshToken = await decryptToken(account.refreshToken);
    if (!accessToken) return redirect(request, "oauth_connection_failed");
    const profile = await getLunchMoneyProfile(accessToken);
    if (
      String(profile.id) !== account.accountId ||
      profile.email.toLowerCase() !== user.email.toLowerCase()
    ) {
      return redirect(request, "oauth_identity_mismatch");
    }

    const expiresAt = account.accessTokenExpiresAt;
    await upsertOAuthConnection(
      user.id,
      {
        type: "oauth",
        accessToken,
        ...(refreshToken && { refreshToken }),
        ...(expiresAt && { expiresAt: new Date(expiresAt).toISOString() }),
        ...(account.scope && {
          scope: account.scope.split(/\s+/).filter(Boolean),
        }),
      },
      {
        name: profile.name,
        budgetName: profile.budget_name,
        email: profile.email,
        externalAccountId: profile.account_id,
        externalUserId: profile.id,
      }
    );
    return redirect(request);
  } catch {
    return redirect(request, "oauth_connection_failed");
  }
}
