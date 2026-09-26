import { randomUUID } from "node:crypto";
import { database } from "@/lib/server/database";
import {
  decryptCredential,
  encryptCredential,
} from "@/lib/server/credential-crypto";

export interface LunchMoneyConnection {
  id: string;
  userId: string;
  provider: "lunch_money";
  authMethod: "api_key" | "oauth";
  label: string;
  budgetName: string | null;
  email: string | null;
  externalAccountId: string;
  createdAt: string;
}

interface ConnectionRow {
  id: string;
  userId: string;
  externalAccountId: string;
  label: string;
  budgetName: string | null;
  email: string | null;
  authMethod: "api_key" | "oauth";
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

export function listConnections(userId: string): {
  accounts: LunchMoneyConnection[];
  activeAccountId: string | null;
} {
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
  const activeAccountId = rows.some(
    (row) => row.id === context?.activeConnectionId
  )
    ? (context?.activeConnectionId ?? null)
    : (rows[0]?.id ?? null);
  return { accounts: rows.map(publicConnection), activeAccountId };
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
    authMethod: "api_key",
    credentialCiphertext: encryptCredential({ type: "api_key", token }),
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

export function getApiKey(userId: string, connectionId: string): string | null {
  const row = database
    .prepare(
      'select "credentialCiphertext" from "lunch_money_connection" where "id" = ? and "userId" = ?'
    )
    .get(connectionId, userId) as { credentialCiphertext: string } | undefined;
  if (!row) return null;
  const credential = decryptCredential(row.credentialCiphertext);
  return credential.type === "api_key" ? credential.token : null;
}
