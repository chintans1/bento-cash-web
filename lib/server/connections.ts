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

async function upsertConnection(
  userId: string,
  authMethod: LunchMoneyConnection["authMethod"],
  credential: StoredCredential,
  profile: {
    name: string;
    budgetName: string;
    email: string;
    externalAccountId: string | number;
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
    label: profile.budgetName || profile.name || "Lunch Money",
    budgetName: profile.budgetName || null,
    email: profile.email || null,
    authMethod,
    credentialCiphertext: encryptCredential(credential),
    createdAt: existing?.createdAt ?? now,
  };

  await store.batch([
    {
      sql: `insert into "lunch_money_connection"
          ("id", "userId", "externalAccountId", "label", "budgetName", "email", "authMethod", "credentialCiphertext", "createdAt", "updatedAt")
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict ("userId", "externalAccountId") do update set
          "label" = excluded."label",
          "budgetName" = excluded."budgetName",
          "email" = excluded."email",
          "authMethod" = excluded."authMethod",
          "credentialCiphertext" = excluded."credentialCiphertext",
          "updatedAt" = excluded."updatedAt"`,
      params: [
        row.id,
        row.userId,
        row.externalAccountId,
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
         values (?, ?, ?)
         on conflict ("userId") do update set
          "activeConnectionId" = excluded."activeConnectionId",
          "updatedAt" = excluded."updatedAt"`,
      params: [userId, row.id, now],
    },
  ]);

  return publicConnection(row);
}

export async function upsertApiKeyConnection(
  userId: string,
  token: string,
  profile: {
    name: string;
    budgetName: string;
    email: string;
    externalAccountId: string | number;
  }
): Promise<LunchMoneyConnection> {
  return upsertConnection(
    userId,
    "api_key",
    { type: "api_key", token },
    profile
  );
}

/** Used by the Lunch Money OAuth callback once the provider is available. */
export async function upsertOAuthConnection(
  userId: string,
  credential: Extract<StoredCredential, { type: "oauth" }>,
  profile: {
    name: string;
    budgetName: string;
    email: string;
    externalAccountId: string | number;
  }
): Promise<LunchMoneyConnection> {
  return upsertConnection(userId, "oauth", credential, profile);
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

/** Server-only credential resolver shared by API-key and future OAuth clients. */
export async function getConnectionCredential(
  userId: string,
  connectionId: string
): Promise<StoredCredential | null> {
  const store = await getStore();
  const row = await store.first<{ credentialCiphertext: string }>(
    'select "credentialCiphertext" from "lunch_money_connection" where "id" = ? and "userId" = ?',
    [connectionId, userId]
  );
  if (!row) return null;
  return decryptCredential(row.credentialCiphertext);
}
