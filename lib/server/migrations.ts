import authMigration from "../../migrations/001_better_auth.sql?raw";
import connectionsMigration from "../../migrations/002_bento_connections.sql?raw";
import identityMigration from "../../migrations/003_google_identity_migration.sql?raw";

export const migrations = [
  ["001_better_auth.sql", authMigration],
  ["002_bento_connections.sql", connectionsMigration],
  ["003_google_identity_migration.sql", identityMigration],
] as const;
