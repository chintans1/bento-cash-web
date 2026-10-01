import { DurableObject } from "cloudflare:workers";
import { migrations } from "./migrations";

export type DatabaseValue = string | number | null;
export type DatabaseCommand = { sql: string; params: DatabaseValue[] };
export type DatabaseResult = {
  results: Record<string, unknown>[];
  changes: number;
  lastRowId: number;
};

/** One named object holds the app's relational data in SQLite storage. */
export class BentoDatabase extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.transactionSync(() => {
      const sql = ctx.storage.sql;
      sql.exec(
        'create table if not exists "bento_migration" ("name" text not null primary key, "appliedAt" text not null)'
      );
      for (const [name, migration] of migrations) {
        const applied = sql
          .exec('select 1 from "bento_migration" where "name" = ?', name)
          .toArray()[0];
        if (applied) continue;
        sql.exec(migration);
        sql.exec(
          'insert into "bento_migration" ("name", "appliedAt") values (?, ?)',
          name,
          new Date().toISOString()
        );
      }
    });
  }

  query(command: DatabaseCommand): DatabaseResult {
    const cursor = this.ctx.storage.sql.exec(command.sql, ...command.params);
    const results = cursor.toArray() as Record<string, unknown>[];
    const lastRowId = this.ctx.storage.sql
      .exec("select last_insert_rowid() as id")
      .one().id as number;
    return { results, changes: cursor.rowsWritten, lastRowId };
  }

  batch(commands: DatabaseCommand[]): DatabaseResult[] {
    return this.ctx.storage.transactionSync(() =>
      commands.map((command) => this.query(command))
    );
  }
}

export default {
  fetch() {
    return new Response("Not found", { status: 404 });
  },
};
