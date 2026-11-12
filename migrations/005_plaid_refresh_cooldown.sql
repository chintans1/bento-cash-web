create table "plaid_refresh_cooldown" (
  "externalAccountId" text not null primary key,
  "retryAt" integer not null
);
