import { randomUUID } from "node:crypto";
import { database } from "@/lib/server/database";
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

export function listConnections(userId: string): LunchMoneyConnectionsState {
  const rows = database
    .prepare(
      'select * from "lunch_money_connection" where "userId" = ? order by "createdAt" asc'
    )
    .all(userId) as ConnectionRow[];
  const context = database
    .prepare(
      'select "activeConnectionId" from "bento_user_context" where "userId" = ?'
    )
    .get(userId) as { activeConnectionId: string | null } | undefined;
  const activeConnectionId = rows.some(
    (row) => row.id === context?.activeConnectionId
  )
    ? (context?.activeConnectionId ?? null)
    : (rows[0]?.id ?? null);
  return { connections: rows.map(publicConnection), activeConnectionId };
}

function upsertConnection(
  userId: string,
  authMethod: LunchMoneyConnection["authMethod"],
  credential: StoredCredential,
  profile: {
    name: string;
    budgetName: string;
    email: string;
    externalAccountId: string | number;
  }
): LunchMoneyConnection {
  const existing = database
    .prepare(
      'select * from "lunch_money_connection" where "userId" = ? and "externalAccountId" = ?'
    )
    .get(userId, String(profile.externalAccountId)) as
    | ConnectionRow
    | undefined;
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

  database.transaction(() => {
    database
      .prepare(
        `insert into "lunch_money_connection"
          ("id", "userId", "externalAccountId", "label", "budgetName", "email", "authMethod", "credentialCiphertext", "createdAt", "updatedAt")
         values (@id, @userId, @externalAccountId, @label, @budgetName, @email, @authMethod, @credentialCiphertext, @createdAt, @updatedAt)
         on conflict ("userId", "externalAccountId") do update set
          "label" = excluded."label",
          "budgetName" = excluded."budgetName",
          "email" = excluded."email",
          "authMethod" = excluded."authMethod",
          "credentialCiphertext" = excluded."credentialCiphertext",
          "updatedAt" = excluded."updatedAt"`
      )
      .run({ ...row, updatedAt: now });
    database
      .prepare(
        `insert into "bento_user_context" ("userId", "activeConnectionId", "updatedAt")
         values (?, ?, ?)
         on conflict ("userId") do update set
          "activeConnectionId" = excluded."activeConnectionId",
          "updatedAt" = excluded."updatedAt"`
      )
      .run(userId, row.id, now);
  })();

  return publicConnection(row);
}

export function upsertApiKeyConnection(
  userId: string,
  token: string,
  profile: {
    name: string;
    budgetName: string;
    email: string;
    externalAccountId: string | number;
  }
): LunchMoneyConnection {
  return upsertConnection(
    userId,
    "api_key",
    { type: "api_key", token },
    profile
  );
}

/** Used by the Lunch Money OAuth callback once the provider is available. */
export function upsertOAuthConnection(
  userId: string,
  credential: Extract<StoredCredential, { type: "oauth" }>,
  profile: {
    name: string;
    budgetName: string;
    email: string;
    externalAccountId: string | number;
  }
): LunchMoneyConnection {
  return upsertConnection(userId, "oauth", credential, profile);
}

export function setActiveConnection(userId: string, connectionId: string) {
  const ownsConnection = database
    .prepare(
      'select 1 from "lunch_money_connection" where "id" = ? and "userId" = ?'
    )
    .get(connectionId, userId);
  if (!ownsConnection) return false;
  database
    .prepare(
      `insert into "bento_user_context" ("userId", "activeConnectionId", "updatedAt")
       values (?, ?, ?)
       on conflict ("userId") do update set
        "activeConnectionId" = excluded."activeConnectionId",
        "updatedAt" = excluded."updatedAt"`
    )
    .run(userId, connectionId, new Date().toISOString());
  return true;
}

export function removeConnection(
  userId: string,
  connectionId: string
): boolean {
  return database.transaction(() => {
    const result = database
      .prepare(
        'delete from "lunch_money_connection" where "id" = ? and "userId" = ?'
      )
      .run(connectionId, userId);
    if (result.changes === 0) return false;
    const next = database
      .prepare(
        'select "id" from "lunch_money_connection" where "userId" = ? order by "createdAt" asc limit 1'
      )
      .get(userId) as { id: string } | undefined;
    database
      .prepare(
        'update "bento_user_context" set "activeConnectionId" = ?, "updatedAt" = ? where "userId" = ?'
      )
      .run(next?.id ?? null, new Date().toISOString(), userId);
    return true;
  })();
}

/** Server-only credential resolver shared by API-key and future OAuth clients. */
export function getConnectionCredential(
  userId: string,
  connectionId: string
): StoredCredential | null {
  const row = database
    .prepare(
      'select "credentialCiphertext" from "lunch_money_connection" where "id" = ? and "userId" = ?'
    )
    .get(connectionId, userId) as { credentialCiphertext: string } | undefined;
  if (!row) return null;
  return decryptCredential(row.credentialCiphertext);
}
