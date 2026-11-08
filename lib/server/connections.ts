import { randomUUID } from "node:crypto";
import { getStore } from "@/lib/server/database";
import {
  decryptCredential,
  encryptCredential,
  type StoredCredential,
} from "@/lib/server/credential-crypto";
import type {
  ConnectionAuthMethod,
  LunchMoneyConnection,
  LunchMoneyConnectionsState,
} from "@/lib/lunchmoney/connection-types";

interface ConnectionRow {
  id: string;
  userId: string;
  externalAccountId: string;
  externalUserId: string | null;
  label: string;
  budgetName: string | null;
  email: string | null;
  authMethod: ConnectionAuthMethod;
  credentialCiphertext: string;
  createdAt: string;
}

function publicConnection(row: ConnectionRow): LunchMoneyConnection {
  return {
    id: row.id,
    userId: row.userId,
    provider: "lunch_money",
    authMethod: row.authMethod,
    label: row.label,
    budgetName: row.budgetName,
    email: row.email,
    externalAccountId: row.externalAccountId,
    externalUserId: row.externalUserId,
    createdAt: row.createdAt,
  };
}

export async function listConnections(
  userId: string
): Promise<LunchMoneyConnectionsState> {
  const store = await getStore();
  const rows = await store.all<ConnectionRow>(
    'select * from "lunch_money_connection" where "userId" = ? order by "createdAt" asc',
    [userId]
  );
  const context = await store.first<{ activeConnectionId: string | null }>(
    'select "activeConnectionId" from "bento_user_context" where "userId" = ?',
    [userId]
  );
  const activeConnectionId = rows.some(
    (row) => row.id === context?.activeConnectionId
  )
    ? (context?.activeConnectionId ?? null)
    : (rows[0]?.id ?? null);
  return { connections: rows.map(publicConnection), activeConnectionId };
}

export async function upsertOAuthConnection(
  userId: string,
  credential: Extract<StoredCredential, { type: "oauth" }>,
  profile: {
    budgetName: string;
    email: string;
    externalAccountId: string | number;
    externalUserId: string | number;
  }
): Promise<LunchMoneyConnection> {
  const store = await getStore();
  const existing = await store.first<ConnectionRow>(
    'select * from "lunch_money_connection" where "userId" = ? and "externalAccountId" = ?',
    [userId, String(profile.externalAccountId)]
  );
  const now = new Date().toISOString();
  const row: ConnectionRow = {
    id: existing?.id ?? `lma_${randomUUID()}`,
    userId,
    externalAccountId: String(profile.externalAccountId),
    externalUserId: String(profile.externalUserId),
    label: profile.budgetName,
    budgetName: profile.budgetName,
    email: profile.email,
    authMethod: "oauth",
    credentialCiphertext: encryptCredential(credential),
    createdAt: existing?.createdAt ?? now,
  };

  await store.batch([
    {
      sql: `insert into "lunch_money_connection"
          ("id", "userId", "externalAccountId", "externalUserId", "label", "budgetName", "email", "authMethod", "credentialCiphertext", "createdAt", "updatedAt")
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict ("userId", "externalAccountId") do update set
          "externalUserId" = excluded."externalUserId",
          "label" = excluded."label",
          "budgetName" = excluded."budgetName",
          "email" = excluded."email",
          "authMethod" = excluded."authMethod",
          "credentialCiphertext" = excluded."credentialCiphertext",
          "updatedAt" = excluded."updatedAt",
          "refreshAttemptId" = null
         where "lunch_money_connection"."externalUserId" is null
            or "lunch_money_connection"."externalUserId" = excluded."externalUserId"`,
      params: [
        row.id,
        row.userId,
        row.externalAccountId,
        row.externalUserId,
        row.label,
        row.budgetName,
        row.email,
        row.authMethod,
        row.credentialCiphertext,
        row.createdAt,
        now,
      ],
    },
    {
      sql: `insert into "bento_user_context" ("userId", "activeConnectionId", "updatedAt")
         select ?, "id", ? from "lunch_money_connection"
         where "userId" = ? and "externalAccountId" = ?
           and "externalUserId" = ?
         on conflict ("userId") do update set
          "activeConnectionId" = excluded."activeConnectionId",
          "updatedAt" = excluded."updatedAt"`,
      params: [userId, now, userId, row.externalAccountId, row.externalUserId],
    },
  ]);

  const saved = await store.first<ConnectionRow>(
    'select * from "lunch_money_connection" where "userId" = ? and "externalAccountId" = ?',
    [userId, row.externalAccountId]
  );
  if (!saved || saved.externalUserId !== row.externalUserId) {
    throw new Error("This budget belongs to another Lunch Money user");
  }
  return publicConnection(saved);
}

export interface ConnectionCredentialRecord {
  credential: StoredCredential;
  ciphertext: string;
  refreshAttemptId: string | null;
}

export async function getConnectionCredentialRecord(
  userId: string,
  connectionId: string
): Promise<ConnectionCredentialRecord | null> {
  const store = await getStore();
  const row = await store.first<{
    credentialCiphertext: string;
    refreshAttemptId: string | null;
  }>(
    'select "credentialCiphertext", "refreshAttemptId" from "lunch_money_connection" where "id" = ? and "userId" = ?',
    [connectionId, userId]
  );
  if (!row) return null;
  return {
    credential: decryptCredential(row.credentialCiphertext),
    ciphertext: row.credentialCiphertext,
    refreshAttemptId: row.refreshAttemptId,
  };
}

export async function claimOAuthRefresh(
  userId: string,
  connectionId: string,
  ciphertext: string,
  attemptId: string
): Promise<boolean> {
  const store = await getStore();
  const result = await store.run(
    `update "lunch_money_connection"
       set "refreshAttemptId" = ?
       where "id" = ? and "userId" = ?
         and "credentialCiphertext" = ? and "refreshAttemptId" is null`,
    [attemptId, connectionId, userId, ciphertext]
  );
  return result.changes === 1;
}

export async function replaceOAuthCredential(
  userId: string,
  connectionId: string,
  ciphertext: string,
  attemptId: string,
  credential: Extract<StoredCredential, { type: "oauth" }>
): Promise<string | null> {
  const store = await getStore();
  const newCiphertext = encryptCredential(credential);
  const result = await store.run(
    `update "lunch_money_connection"
       set "credentialCiphertext" = ?, "refreshAttemptId" = null,
           "updatedAt" = ?
       where "id" = ? and "userId" = ?
         and "credentialCiphertext" = ? and "refreshAttemptId" = ?`,
    [
      newCiphertext,
      new Date().toISOString(),
      connectionId,
      userId,
      ciphertext,
      attemptId,
    ]
  );
  return result.changes === 1 ? newCiphertext : null;
}

export async function setActiveConnection(
  userId: string,
  connectionId: string
): Promise<boolean> {
  const store = await getStore();
  const ownsConnection = await store.first(
    'select 1 from "lunch_money_connection" where "id" = ? and "userId" = ?',
    [connectionId, userId]
  );
  if (!ownsConnection) return false;
  await store.run(
    `insert into "bento_user_context" ("userId", "activeConnectionId", "updatedAt")
       values (?, ?, ?)
       on conflict ("userId") do update set
        "activeConnectionId" = excluded."activeConnectionId",
        "updatedAt" = excluded."updatedAt"`,
    [userId, connectionId, new Date().toISOString()]
  );
  return true;
}

export async function removeConnection(
  userId: string,
  connectionId: string
): Promise<boolean> {
  const store = await getStore();
  const existing = await store.first(
    'select 1 from "lunch_money_connection" where "id" = ? and "userId" = ?',
    [connectionId, userId]
  );
  if (!existing) return false;
  await store.batch([
    {
      sql: 'delete from "lunch_money_connection" where "id" = ? and "userId" = ?',
      params: [connectionId, userId],
    },
    {
      sql: `update "bento_user_context"
            set "activeConnectionId" = (
              select "id" from "lunch_money_connection"
              where "userId" = ? order by "createdAt" asc limit 1
            ), "updatedAt" = ?
            where "userId" = ?`,
      params: [userId, new Date().toISOString(), userId],
    },
  ]);
  return true;
}
