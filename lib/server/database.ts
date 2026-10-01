import { env } from "cloudflare:workers";
import {
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type CompiledQuery,
  type DatabaseConnection,
  type Dialect,
  type Driver,
  type Kysely,
  type QueryResult,
} from "kysely";
import type {
  DatabaseCommand,
  DatabaseResult,
  DatabaseValue,
} from "./database-object";

export type SqlParams = readonly DatabaseValue[];
export type SqlCommand = { sql: string; params?: SqlParams };

export interface SqlStore {
  first<T>(sql: string, params?: SqlParams): Promise<T | undefined>;
  all<T>(sql: string, params?: SqlParams): Promise<T[]>;
  run(sql: string, params?: SqlParams): Promise<{ changes: number }>;
  batch(commands: readonly SqlCommand[]): Promise<void>;
}

type DatabaseStub = {
  query(command: DatabaseCommand): Promise<DatabaseResult>;
  batch(commands: DatabaseCommand[]): Promise<DatabaseResult[]>;
};

function getStub(): DatabaseStub {
  const namespace = env.BENTO_DB;
  if (!namespace) throw new Error("BENTO_DB Durable Object binding is missing");
  return namespace.get(
    namespace.idFromName("bento")
  ) as unknown as DatabaseStub;
}

async function query(
  sql: string,
  params: SqlParams = []
): Promise<DatabaseResult> {
  return getStub().query({ sql, params: [...params] });
}

const connection: DatabaseConnection = {
  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    const result = await query(
      compiledQuery.sql,
      compiledQuery.parameters as DatabaseValue[]
    );
    return {
      rows: result.results as R[],
      numAffectedRows: BigInt(result.changes),
      insertId: BigInt(result.lastRowId),
    };
  },
  streamQuery() {
    throw new Error("Streaming SQL queries are unsupported");
  },
};

class DurableObjectDialect implements Dialect {
  createDriver(): Driver {
    return {
      async init() {},
      async acquireConnection() {
        return connection;
      },
      async beginTransaction() {
        throw new Error("Interactive SQL transactions are unsupported");
      },
      async commitTransaction() {
        throw new Error("Interactive SQL transactions are unsupported");
      },
      async rollbackTransaction() {
        throw new Error("Interactive SQL transactions are unsupported");
      },
      async releaseConnection() {},
      async destroy() {},
    };
  }

  createQueryCompiler() {
    return new SqliteQueryCompiler();
  }

  createAdapter() {
    return new SqliteAdapter();
  }

  createIntrospector(db: Kysely<unknown>) {
    return new SqliteIntrospector(db);
  }
}

export const authDatabase = {
  dialect: new DurableObjectDialect(),
  type: "sqlite" as const,
  transaction: false,
};

export async function getStore(): Promise<SqlStore> {
  return {
    async first<T>(sql: string, params: SqlParams = []) {
      return (await query(sql, params)).results[0] as T | undefined;
    },
    async all<T>(sql: string, params: SqlParams = []) {
      return (await query(sql, params)).results as T[];
    },
    async run(sql: string, params: SqlParams = []) {
      return { changes: (await query(sql, params)).changes };
    },
    async batch(commands: readonly SqlCommand[]) {
      if (commands.length === 0) return;
      await getStub().batch(
        commands.map(({ sql, params = [] }) => ({ sql, params: [...params] }))
      );
    },
  };
}
