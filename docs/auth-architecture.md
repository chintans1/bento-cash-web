# Authentication architecture

Bento Cash uses [Better Auth](https://www.better-auth.com/) with SQLite. The
system separates two identities:

- **Bento user** — an email/password identity with a server-managed session.
- **Lunch Money connection** — one budgeting account linked to that Bento user
  through an API key today or OAuth later.

## Persistence and ownership

Better Auth owns the `user`, `session`, `account`, and `verification` tables.
Bento's migrations add:

- `lunch_money_connection`, with a foreign key to its Bento user.
- `bento_user_context`, containing the user's active connection.
- `connection_feature_setting`, keyed by user, connection, and feature key.

Every connection query includes the authenticated Better Auth user ID. API
routes return `404` rather than accepting a connection owned by another user.
Client caches use `<bento-user-id>:<connection-id>` as a non-secret session
scope and are remounted when that scope changes.

## Credential handling

When a user adds an API key, the server first verifies it with Lunch Money's
`/me` endpoint. The key is encrypted with AES-256-GCM using
`BENTO_CREDENTIAL_ENCRYPTION_KEY`, or `BETTER_AUTH_SECRET` when a separate key
is not configured. Only ciphertext is stored in SQLite.

The browser receives public connection metadata but never receives a saved
credential. Lunch Money reads and writes go through the authenticated
`/api/lunch-money` route, which checks connection ownership before decrypting a
credential. The allowed RPC operations are explicitly listed server-side.

Previously browser-local `lm_token` and `bento_auth_v1` keys are imported after
the user signs in, then removed after every connection is stored successfully.

## OAuth migration

The connection record already has an `authMethod` discriminator. An OAuth flow
can store encrypted access/refresh credentials in the same server-only field
without changing connection ownership, active-account switching, feature
settings, or client cache scopes. Token refresh belongs in the server
connection resolver; OAuth credentials must never be returned through the
connections API.

## Operations

- Copy `.env.example` to `.env.local` and set `BETTER_AUTH_SECRET`.
- `pnpm db:migrate` applies every unapplied migration transactionally.
- `pnpm dev` and `pnpm start` run migrations before starting the app.
- Back up `data/bento.db` and retain the credential-encryption secret. Losing or
  changing the secret makes stored Lunch Money credentials unreadable.

SQLite is appropriate for a single long-running Bento Cash deployment. A
multi-instance or serverless deployment should move the same schema to a
network database supported by Better Auth.
