import { getStore } from "@/lib/server/database";

export async function ownsConnection(
  userId: string,
  connectionId: string
): Promise<boolean> {
  const store = await getStore();
  return !!(await store.first(
    'select 1 from "lunch_money_connection" where "id" = ? and "userId" = ?',
    [connectionId, userId]
  ));
}

export async function getFeatureSetting(
  userId: string,
  connectionId: string,
  key: string
): Promise<string | null> {
  if (!(await ownsConnection(userId, connectionId))) return null;
  const store = await getStore();
  const row = await store.first<{ value: string }>(
    'select "value" from "connection_feature_setting" where "userId" = ? and "connectionId" = ? and "key" = ?',
    [userId, connectionId, key]
  );
  return row?.value ?? null;
}

export async function setFeatureSetting(
  userId: string,
  connectionId: string,
  key: string,
  value: string
): Promise<boolean> {
  if (!(await ownsConnection(userId, connectionId))) return false;
  const store = await getStore();
  await store.run(
    `insert into "connection_feature_setting" ("userId", "connectionId", "key", "value", "updatedAt")
       values (?, ?, ?, ?, ?)
       on conflict ("userId", "connectionId", "key") do update set
        "value" = excluded."value", "updatedAt" = excluded."updatedAt"`,
    [userId, connectionId, key, value, new Date().toISOString()]
  );
  return true;
}
