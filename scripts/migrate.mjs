import Database from "better-sqlite3";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const databasePath =
  process.env.BENTO_DATABASE_PATH ?? join(process.cwd(), "data", "bento.db");
const migrationsPath = join(process.cwd(), "migrations");

if (databasePath !== ":memory:")
  mkdirSync(dirname(databasePath), { recursive: true });

const database = new Database(databasePath);
database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");
database.exec(`
  create table if not exists "bento_migration" (
    "name" text not null primary key,
    "appliedAt" text not null
  )
`);

const applied = database
  .prepare('select "name" from "bento_migration"')
  .all()
  .map((row) => row.name);
const appliedNames = new Set(applied);
const migrations = readdirSync(migrationsPath)
  .filter((name) => name.endsWith(".sql"))
  .sort();

const applyMigration = database.transaction((name, sql) => {
  database.exec(sql);
  database
    .prepare(
      'insert into "bento_migration" ("name", "appliedAt") values (?, ?)'
    )
    .run(name, new Date().toISOString());
});

for (const name of migrations) {
  if (appliedNames.has(name)) continue;
  applyMigration(name, readFileSync(join(migrationsPath, name), "utf8"));
  process.stdout.write(`Applied ${name}\n`);
}

database.close();
