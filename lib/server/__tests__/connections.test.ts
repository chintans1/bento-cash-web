import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { SqlParams, SqlStore } from "../database";
import { encryptCredential } from "../credential-crypto";

const ownerId = "test-owner";
const otherId = "test-other";
let connections: typeof import("../connections");
let settings: typeof import("../feature-settings");
let appDatabase: DatabaseSync;

const mocks = vi.hoisted(() => ({ store: null as SqlStore | null }));
vi.mock("../database", () => ({ getStore: async () => mocks.store }));

beforeAll(async () => {
  appDatabase = new DatabaseSync(":memory:");
  appDatabase.exec("pragma foreign_keys = ON");
  appDatabase.exec(
    readFileSync(join(process.cwd(), "migrations/001_better_auth.sql"), "utf8")
  );
  appDatabase.exec(
    readFileSync(
      join(process.cwd(), "migrations/002_bento_connections.sql"),
      "utf8"
    )
  );
  appDatabase.exec(
    readFileSync(
      join(process.cwd(), "migrations/004_lunch_money_oauth.sql"),
      "utf8"
    )
  );
  const insertUser = appDatabase.prepare(
    `insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
     values (?, ?, ?, 0, ?, ?)`
  );
  const now = new Date().toISOString();
  insertUser.run(ownerId, "Owner", "owner@example.com", now, now);
  insertUser.run(otherId, "Other", "other@example.com", now, now);
  const store: SqlStore = {
    async first<T>(sql: string, params: SqlParams = []) {
      return appDatabase.prepare(sql).get(...params) as T | undefined;
    },
    async all<T>(sql: string, params: SqlParams = []) {
      return appDatabase.prepare(sql).all(...params) as T[];
    },
    async run(sql, params = []) {
      const result = appDatabase.prepare(sql).run(...params);
      return { changes: Number(result.changes) };
    },
    async batch(commands) {
      appDatabase.exec("begin");
      try {
        for (const { sql, params = [] } of commands) {
          appDatabase.prepare(sql).run(...params);
        }
        appDatabase.exec("commit");
      } catch (error) {
        appDatabase.exec("rollback");
        throw error;
      }
    },
  };
  mocks.store = store;
  process.env.BENTO_CREDENTIAL_ENCRYPTION_KEY = "test-only-encryption-secret";
  connections = await import("../connections");
  settings = await import("../feature-settings");
});

afterAll(() => {
  appDatabase?.close();
  delete process.env.BENTO_CREDENTIAL_ENCRYPTION_KEY;
});

function seedLegacyConnection(accountId: string, token: string): string {
  const id = `legacy-${accountId}`;
  const label = accountId === "42" ? "Family budget" : "Business budget";
  const now = new Date().toISOString();
  appDatabase
    .prepare(
      `insert into "lunch_money_connection"
       ("id", "userId", "externalAccountId", "label", "budgetName", "email", "authMethod", "credentialCiphertext", "createdAt", "updatedAt")
       values (?, ?, ?, ?, ?, ?, 'api_key', ?, ?, ?)`
    )
    .run(
      id,
      ownerId,
      accountId,
      label,
      label,
      "owner@example.com",
      encryptCredential({ type: "api_key", token }),
      now,
      now
    );
  appDatabase
    .prepare(
      `insert into "bento_user_context" ("userId", "activeConnectionId", "updatedAt")
       values (?, ?, ?)
       on conflict ("userId") do update set
         "activeConnectionId" = excluded."activeConnectionId",
         "updatedAt" = excluded."updatedAt"`
    )
    .run(ownerId, id, now);
  return id;
}

describe("Lunch Money connection persistence", () => {
  it("encrypts credentials and selects a newly linked account", async () => {
    const id = seedLegacyConnection("42", "super-secret-api-key");
    const state = await connections.listConnections(ownerId);
    const account = state.connections[0];
    expect(account.id).toBe(id);
    expect(state.activeConnectionId).toBe(id);
    expect(
      (await connections.getConnectionCredentialRecord(ownerId, account.id))
        ?.credential
    ).toEqual({
      type: "api_key",
      token: "super-secret-api-key",
    });

    const stored = appDatabase
      .prepare(
        'select "credentialCiphertext" from "lunch_money_connection" where "id" = ?'
      )
      .get(account.id) as { credentialCiphertext: string };
    expect(stored.credentialCiphertext).toMatch(/^v1\./);
    expect(stored.credentialCiphertext).not.toContain("super-secret-api-key");
  });

  it("persists active-account switching", async () => {
    const first = (await connections.listConnections(ownerId)).connections[0];
    const second = seedLegacyConnection("84", "second-secret-api-key");
    expect(
      (await connections.listConnections(ownerId)).activeConnectionId
    ).toBe(second);
    expect(await connections.setActiveConnection(ownerId, first.id)).toBe(true);
    expect(
      (await connections.listConnections(ownerId)).activeConnectionId
    ).toBe(first.id);
  });

  it("enforces ownership for selection, settings, credentials, and deletion", async () => {
    const account = (await connections.listConnections(ownerId)).connections[0];
    expect(await connections.setActiveConnection(otherId, account.id)).toBe(
      false
    );
    expect(
      await connections.getConnectionCredentialRecord(otherId, account.id)
    ).toBeNull();
    expect(
      await settings.setFeatureSetting(otherId, account.id, "test", "value")
    ).toBe(false);
    expect(
      await settings.getFeatureSetting(otherId, account.id, "test")
    ).toBeNull();
    expect(await connections.removeConnection(otherId, account.id)).toBe(false);
    expect(
      (await connections.listConnections(ownerId)).connections
    ).toHaveLength(2);
  });

  it("persists feature settings for the owning user/account pair", async () => {
    const account = (await connections.listConnections(ownerId)).connections[0];
    expect(
      await settings.setFeatureSetting(ownerId, account.id, "months", "6")
    ).toBe(true);
    expect(
      await settings.getFeatureSetting(ownerId, account.id, "months")
    ).toBe("6");
  });

  it("can upgrade a connection to OAuth without changing its identity", async () => {
    const original = (await connections.listConnections(ownerId))
      .connections[0];
    const upgraded = await connections.upsertOAuthConnection(
      ownerId,
      {
        type: "oauth",
        accessToken: "oauth-access-token",
        refreshToken: "oauth-refresh-token",
        expiresAt: "2030-01-01T00:00:00.000Z",
        scope: ["read", "write"],
      },
      {
        budgetName: original.budgetName ?? original.label,
        email: original.email ?? "owner@example.com",
        externalAccountId: original.externalAccountId,
        externalUserId: "lunch-money-user-1",
      }
    );

    expect(upgraded.id).toBe(original.id);
    expect(upgraded.authMethod).toBe("oauth");
    expect(upgraded.externalUserId).toBe("lunch-money-user-1");
    expect(
      (await connections.getConnectionCredentialRecord(ownerId, upgraded.id))
        ?.credential
    ).toEqual({
      type: "oauth",
      accessToken: "oauth-access-token",
      refreshToken: "oauth-refresh-token",
      expiresAt: "2030-01-01T00:00:00.000Z",
      scope: ["read", "write"],
    });

    const record = await connections.getConnectionCredentialRecord(
      ownerId,
      upgraded.id
    );
    expect(record).not.toBeNull();
    expect(
      await connections.claimOAuthRefresh(
        ownerId,
        upgraded.id,
        record!.ciphertext,
        "attempt-1"
      )
    ).toBe(true);
    expect(
      await connections.claimOAuthRefresh(
        ownerId,
        upgraded.id,
        record!.ciphertext,
        "attempt-2"
      )
    ).toBe(false);
    const ciphertext = await connections.replaceOAuthCredential(
      ownerId,
      upgraded.id,
      record!.ciphertext,
      "attempt-1",
      { type: "oauth", accessToken: "replacement", refreshToken: "rotated" }
    );
    expect(ciphertext).toMatch(/^v1\./);
    expect(
      (await connections.getConnectionCredentialRecord(ownerId, upgraded.id))
        ?.ciphertext
    ).toBe(ciphertext);
    expect(
      (await connections.getConnectionCredentialRecord(ownerId, upgraded.id))
        ?.credential
    ).toEqual({
      type: "oauth",
      accessToken: "replacement",
      refreshToken: "rotated",
    });
  });

  it("uses the budget returned on reconnect instead of reusing the previous one", async () => {
    const credential = { type: "oauth" as const, accessToken: "token" };
    const profile = {
      email: "owner@example.com",
      externalUserId: 17,
    };
    const first = await connections.upsertOAuthConnection(ownerId, credential, {
      ...profile,
      externalAccountId: 101,
      budgetName: "Home",
    });
    const second = await connections.upsertOAuthConnection(
      ownerId,
      credential,
      {
        ...profile,
        externalAccountId: 102,
        budgetName: "Business",
      }
    );

    expect(second.id).not.toBe(first.id);
    expect(
      (await connections.listConnections(ownerId)).activeConnectionId
    ).toBe(second.id);

    const reconnected = await connections.upsertOAuthConnection(
      ownerId,
      credential,
      { ...profile, externalAccountId: 101, budgetName: "Renamed Home" }
    );
    expect(reconnected.id).toBe(first.id);
    expect(reconnected.budgetName).toBe("Renamed Home");
    expect(
      (await connections.listConnections(ownerId)).activeConnectionId
    ).toBe(first.id);
  });
});
