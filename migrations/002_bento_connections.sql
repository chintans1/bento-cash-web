create table "lunch_money_connection" (
  "id" text not null primary key,
  "userId" text not null references "user" ("id") on delete cascade,
  "externalAccountId" text not null,
  "label" text not null,
  "budgetName" text,
  "email" text,
  "authMethod" text not null check ("authMethod" in ('api_key', 'oauth')),
  "credentialCiphertext" text not null,
  "createdAt" text not null,
  "updatedAt" text not null,
  unique ("userId", "externalAccountId")
);

create index "lunch_money_connection_userId_idx"
  on "lunch_money_connection" ("userId");

create table "bento_user_context" (
  "userId" text not null primary key references "user" ("id") on delete cascade,
  "activeConnectionId" text references "lunch_money_connection" ("id") on delete set null,
  "updatedAt" text not null
);

create table "connection_feature_setting" (
  "userId" text not null references "user" ("id") on delete cascade,
  "connectionId" text not null references "lunch_money_connection" ("id") on delete cascade,
  "key" text not null,
  "value" text not null,
  "updatedAt" text not null,
  primary key ("userId", "connectionId", "key")
);

create index "connection_feature_setting_connectionId_idx"
  on "connection_feature_setting" ("connectionId");
