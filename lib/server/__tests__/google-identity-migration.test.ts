import { readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

function migration(name: string) {
  return readFileSync(join(process.cwd(), "migrations", name), "utf8");
}

describe("Google-only identity migration", () => {
  it("retires password access while preserving the Bento user's data", () => {
    const database = new Database(":memory:");
    database.pragma("foreign_keys = ON");
    database.exec(migration("001_better_auth.sql"));
    database.exec(migration("002_bento_connections.sql"));

    database
      .prepare(
        `insert into "user"
          ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
         values (?, ?, ?, ?, ?, ?)`
      )
      .run("legacy-user", "Legacy User", "legacy@example.com", 0, 1, 1);
    database
      .prepare(
        `insert into "account"
          ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
         values (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        "password-account",
        "legacy-user",
        "credential",
        "legacy-user",
        "hashed-password",
        1,
        1
      );
    database
      .prepare(
        `insert into "session"
          ("id", "expiresAt", "token", "createdAt", "updatedAt", "userId")
         values (?, ?, ?, ?, ?, ?)`
      )
      .run("old-session", 2, "old-token", 1, 1, "legacy-user");
    database
      .prepare(
        `insert into "lunch_money_connection"
          ("id", "userId", "externalAccountId", "label", "authMethod", "credentialCiphertext", "createdAt", "updatedAt")
         values (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        "connection",
        "legacy-user",
        "budget",
        "Lunch Money",
        "api_key",
        "encrypted",
        "now",
        "now"
      );

    database.exec(migration("003_google_identity_migration.sql"));

    expect(
      database
        .prepare('select "emailVerified" from "user" where "id" = ?')
        .get("legacy-user")
    ).toEqual({ emailVerified: 1 });
    expect(
      database.prepare('select count(*) as count from "account"').get()
    ).toEqual({ count: 0 });
    expect(
      database.prepare('select count(*) as count from "session"').get()
    ).toEqual({ count: 0 });
    expect(
      database
        .prepare('select "userId" from "lunch_money_connection" where "id" = ?')
        .get("connection")
    ).toEqual({ userId: "legacy-user" });

    database.close();
  });
});
