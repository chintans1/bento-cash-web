import { database } from "@/lib/server/database";

export function ownsConnection(userId: string, connectionId: string): boolean {
  return !!database
    .prepare(
      'select 1 from "lunch_money_connection" where "id" = ? and "userId" = ?'
    )
    .get(connectionId, userId);
}

export function getFeatureSetting(
  userId: string,
  connectionId: string,
  key: string
): string | null {
  if (!ownsConnection(userId, connectionId)) return null;
  const row = database
    .prepare(
      'select "value" from "connection_feature_setting" where "userId" = ? and "connectionId" = ? and "key" = ?'
    )
    .get(userId, connectionId, key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setFeatureSetting(
  userId: string,
  connectionId: string,
  key: string,
  value: string
): boolean {
  if (!ownsConnection(userId, connectionId)) return false;
  database
    .prepare(
      `insert into "connection_feature_setting" ("userId", "connectionId", "key", "value", "updatedAt")
       values (?, ?, ?, ?, ?)
       on conflict ("userId", "connectionId", "key") do update set
        "value" = excluded."value", "updatedAt" = excluded."updatedAt"`
    )
    .run(userId, connectionId, key, value, new Date().toISOString());
  return true;
}
