import "server-only";

import { PLAID_REFRESH_COOLDOWN_MS } from "@/lib/lunchmoney/plaid-refresh";
import { getStore } from "@/lib/server/database";

export async function getPlaidRefreshCooldown(
  userId: string,
  connectionId: string
) {
  const store = await getStore();
  return store.first<{ retryAt: number | null }>(
    `select cooldown."retryAt"
     from "lunch_money_connection" as connection
     left join "plaid_refresh_cooldown" as cooldown using ("externalAccountId")
     where connection."id" = ? and connection."userId" = ?`,
    [connectionId, userId]
  );
}

export async function claimPlaidRefresh(userId: string, connectionId: string) {
  const store = await getStore();
  const now = Date.now();
  const retryAt = now + PLAID_REFRESH_COOLDOWN_MS;
  // One atomic write gates simultaneous requests, including separate
  // connections to the same Lunch Money budget.
  const claimed = await store.run(
    `insert into "plaid_refresh_cooldown" ("externalAccountId", "retryAt")
     select "externalAccountId", ? from "lunch_money_connection"
     where "id" = ? and "userId" = ?
     on conflict ("externalAccountId") do update set "retryAt" = excluded."retryAt"
     where "plaid_refresh_cooldown"."retryAt" <= ?`,
    [retryAt, connectionId, userId, now]
  );
  if (claimed.changes === 1) return { claimed: true, retryAt } as const;
  const current = await getPlaidRefreshCooldown(userId, connectionId);
  return current?.retryAt == null
    ? null
    : ({ claimed: false, retryAt: current.retryAt } as const);
}

export async function extendPlaidRefreshCooldown(
  userId: string,
  connectionId: string,
  retryAt: number
) {
  const store = await getStore();
  await store.run(
    `update "plaid_refresh_cooldown" set "retryAt" = max("retryAt", ?)
     where "externalAccountId" = (
       select "externalAccountId" from "lunch_money_connection"
       where "id" = ? and "userId" = ?
     )`,
    [retryAt, connectionId, userId]
  );
}
