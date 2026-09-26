import Database from "better-sqlite3";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const databasePath =
  process.env.BENTO_DATABASE_PATH ?? join(process.cwd(), "data", "bento.db");

if (databasePath !== ":memory:")
  mkdirSync(dirname(databasePath), { recursive: true });

const globalDatabase = globalThis as typeof globalThis & {
  __bentoDatabase?: Database.Database;
};

export const database =
  globalDatabase.__bentoDatabase ?? new Database(databasePath);

database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");

if (process.env.NODE_ENV !== "production") {
  globalDatabase.__bentoDatabase = database;
}
