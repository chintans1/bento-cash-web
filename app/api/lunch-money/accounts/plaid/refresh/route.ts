import { LunchMoneyError } from "@lunch-money/lunch-money-js-v2";
import {
  connectionQuery,
  lunchMoneyJson,
  lunchMoneyRoute,
} from "@/lib/server/lunch-money-route";
import {
  claimPlaidRefresh,
  extendPlaidRefreshCooldown,
  getPlaidRefreshCooldown,
} from "@/lib/server/plaid-refresh";
import { getRequestUser } from "@/lib/server/session";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return lunchMoneyJson({ error: "Unauthorized" }, 401);
  const input = connectionQuery.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );
  if (!input.success) return lunchMoneyJson({ error: "Invalid request" }, 400);
  const cooldown = await getPlaidRefreshCooldown(
    user.id,
    input.data.connectionId
  );
  return cooldown
    ? lunchMoneyJson(cooldown)
    : lunchMoneyJson({ error: "Connection not found" }, 404);
}

function rateLimited(retryAt: number) {
  return lunchMoneyJson({ retryAt }, 429, {
    "retry-after": String(
      Math.max(1, Math.ceil((retryAt - Date.now()) / 1000))
    ),
  });
}

export function POST(request: Request) {
  // Keep the same reservation if the route retries after an OAuth 401.
  let retryAt: number | undefined;
  return lunchMoneyRoute(
    request,
    connectionQuery,
    async (client, { connectionId }, userId) => {
      if (retryAt === undefined) {
        const reservation = await claimPlaidRefresh(userId, connectionId);
        if (!reservation)
          return lunchMoneyJson({ error: "Connection not found" }, 404);
        if (!reservation.claimed) return rateLimited(reservation.retryAt);
        retryAt = reservation.retryAt;
      }

      try {
        const result = await client.triggerPlaidFetch();
        if (result.queued) return lunchMoneyJson({ retryAt }, 202);
        if (result.retryAt && result.retryAt > retryAt) {
          await extendPlaidRefreshCooldown(
            userId,
            connectionId,
            result.retryAt
          );
          retryAt = result.retryAt;
        }
        return rateLimited(retryAt);
      } catch (error) {
        if (error instanceof LunchMoneyError && error.status === 401)
          throw error;
        const message =
          error instanceof LunchMoneyError && error.status === 403
            ? "This Lunch Money connection does not have permission to refresh Plaid."
            : "Could not confirm the Plaid refresh.";
        return lunchMoneyJson({ error: message, retryAt }, 502);
      }
    }
  );
}
