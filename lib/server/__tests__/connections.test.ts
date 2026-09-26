import Database from "better-sqlite3";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ownerId = "test-owner";
const otherId = "test-other";
let databasePath: string;
let connections: typeof import("../connections");
let settings: typeof import("../feature-settings");
let appDatabase: typeof import("../database").database;

beforeAll(async () => {
  databasePath = join(
    mkdtempSync(join(tmpdir(), "bento-connections-")),
    "test.db"
  );
  const setup = new Database(databasePath);
  setup.exec(
    readFileSync(join(process.cwd(), "migrations/001_better_auth.sql"), "utf8")
  );
  setup.exec(
    readFileSync(
      join(process.cwd(), "migrations/002_bento_connections.sql"),
      "utf8"
    )
  );
  const insertUser = setup.prepare(
    `insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
     values (?, ?, ?, 0, ?, ?)`
  );
  const now = new Date().toISOString();
  insertUser.run(ownerId, "Owner", "owner@example.com", now, now);
  insertUser.run(otherId, "Other", "other@example.com", now, now);
  setup.close();

  process.env.BENTO_DATABASE_PATH = databasePath;
  process.env.BENTO_CREDENTIAL_ENCRYPTION_KEY = "test-only-encryption-secret";
  connections = await import("../connections");
  settings = await import("../feature-settings");
  appDatabase = (await import("../database")).database;
});

afterAll(() => {
  appDatabase?.close();
  delete process.env.BENTO_DATABASE_PATH;
  delete process.env.BENTO_CREDENTIAL_ENCRYPTION_KEY;
});

describe("Lunch Money connection persistence", () => {
  it("encrypts credentials and selects a newly linked account", () => {
    const account = connections.upsertApiKeyConnection(
      ownerId,
      "super-secret-api-key",
      {
        name: "Owner",
        budgetName: "Family budget",
        email: "owner@example.com",
        externalAccountId: 42,
      }
    );

    const state = connections.listConnections(ownerId);
    expect(state.accounts).toEqual([account]);
    expect(state.activeAccountId).toBe(account.id);
    expect(connections.getApiKey(ownerId, account.id)).toBe(
      "super-secret-api-key"
    );

    const stored = appDatabase
      .prepare(
        'select "credentialCiphertext" from "lunch_money_connection" where "id" = ?'
      )
      .get(account.id) as { credentialCiphertext: string };
    expect(stored.credentialCiphertext).toMatch(/^v1\./);
    expect(stored.credentialCiphertext).not.toContain("super-secret-api-key");
  });

  it("persists active-account switching", () => {
    const first = connections.listConnections(ownerId).accounts[0];
    const second = connections.upsertApiKeyConnection(
      ownerId,
      "second-secret-api-key",
      {
        name: "Owner",
        budgetName: "Business budget",
        email: "owner@example.com",
        externalAccountId: 84,
      }
    );
    expect(connections.listConnections(ownerId).activeAccountId).toBe(
      second.id
    );
    expect(connections.setActiveConnection(ownerId, first.id)).toBe(true);
    expect(connections.listConnections(ownerId).activeAccountId).toBe(first.id);
  });

  it("enforces ownership for selection, settings, credentials, and deletion", () => {
    const account = connections.listConnections(ownerId).accounts[0];
    expect(connections.setActiveConnection(otherId, account.id)).toBe(false);
    expect(connections.getApiKey(otherId, account.id)).toBeNull();
    expect(
      settings.setFeatureSetting(otherId, account.id, "test", "value")
    ).toBe(false);
    expect(settings.getFeatureSetting(otherId, account.id, "test")).toBeNull();
    expect(connections.removeConnection(otherId, account.id)).toBe(false);
    expect(connections.listConnections(ownerId).accounts).toHaveLength(2);
  });

  it("persists feature settings for the owning user/account pair", () => {
    const account = connections.listConnections(ownerId).accounts[0];
    expect(settings.setFeatureSetting(ownerId, account.id, "months", "6")).toBe(
      true
    );
    expect(settings.getFeatureSetting(ownerId, account.id, "months")).toBe("6");
  });
});
