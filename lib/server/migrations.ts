import authMigration from "../../migrations/001_better_auth.sql?raw";
import connectionsMigration from "../../migrations/002_bento_connections.sql?raw";
import identityMigration from "../../migrations/003_google_identity_migration.sql?raw";
import oauthMigration from "../../migrations/004_lunch_money_oauth.sql?raw";
import plaidRefreshMigration from "../../migrations/005_plaid_refresh_cooldown.sql?raw";

export const migrations = [
  ["001_better_auth.sql", authMigration],
  ["002_bento_connections.sql", connectionsMigration],
  ["003_google_identity_migration.sql", identityMigration],
  ["004_lunch_money_oauth.sql", oauthMigration],
  ["005_plaid_refresh_cooldown.sql", plaidRefreshMigration],
] as const;
