import { DatabaseSync } from "node:sqlite";
import { describe, expect, it, vi } from "vitest";

vi.mock("cloudflare:workers", () => ({
  DurableObject: class {
    ctx: DurableObjectState;
    constructor(ctx: DurableObjectState) {
      this.ctx = ctx;
    }
  },
}));

import { BentoDatabase } from "../database-object";
import { migrations } from "../migrations";

function localState(database: DatabaseSync) {
  const sql = {
    exec(statement: string, ...params: (string | number | null)[]) {
      if (statement.includes(";") && params.length === 0) {
        database.exec(statement);
        return { toArray: () => [], one: () => undefined, rowsWritten: 0 };
      }
      const prepared = database.prepare(statement);
      if (/^\s*(select|pragma)/i.test(statement)) {
        const rows = prepared.all(...params);
        return {
          toArray: () => rows,
          one: () => rows[0],
          rowsWritten: 0,
        };
      }
      const result = prepared.run(...params);
      return {
        toArray: () => [],
        one: () => undefined,
        rowsWritten: Number(result.changes),
      };
    },
  };
  const storage = {
    sql,
    transactionSync<T>(callback: () => T): T {
      database.exec("begin");
      try {
        const result = callback();
        database.exec("commit");
        return result;
      } catch (error) {
        database.exec("rollback");
        throw error;
      }
    },
  };
  return { storage } as unknown as DurableObjectState;
}

describe("SQLite-backed Durable Object", () => {
  it("applies migrations and rolls back a failed batch", () => {
    const database = new DatabaseSync(":memory:");
    database.exec("pragma foreign_keys = ON");
    const object = new BentoDatabase(localState(database), {} as Env);

    expect(
      object.query({
        sql: 'select "name" from "bento_migration" order by "name"',
        params: [],
      }).results
    ).toEqual(migrations.map(([name]) => ({ name })));

    object.query({
      sql: 'insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt") values (?, ?, ?, 0, ?, ?)',
      params: ["owner", "Owner", "owner@example.com", 1, 1],
    });
    expect(() =>
      object.batch([
        {
          sql: 'insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt") values (?, ?, ?, 0, ?, ?)',
          params: ["other", "Other", "other@example.com", 1, 1],
        },
        {
          sql: 'insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt") values (?, ?, ?, 0, ?, ?)',
          params: ["owner", "Duplicate", "duplicate@example.com", 1, 1],
        },
      ])
    ).toThrow();
    expect(
      object.query({ sql: 'select count(*) as count from "user"', params: [] })
        .results
    ).toEqual([{ count: 1 }]);

    database.close();
  });
});
