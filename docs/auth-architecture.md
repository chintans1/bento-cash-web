# Authentication architecture

Bento Cash uses [Better Auth](https://www.better-auth.com/) with a SQLite-backed
Cloudflare Durable Object. The system separates identity from financial-data access:

- **Bento user** — a provider-backed identity with a server-managed session.
  Google is the only provider today; Bento does not accept passwords.
- **Lunch Money connection** — one budgeting account linked to that Bento user
  through an API key today or OAuth later.

Migration `003_google_identity_migration.sql` retires accounts from the brief
email/password prototype. It invalidates their old sessions, removes the
disabled credential login, and allows the same Bento user (and its existing
Lunch Money connections) to be claimed through Google's verified email. This
keeps Better Auth's strict default linking policy intact for future providers.
The configured identity provider supplies the user's display name and avatar
when it is linked, so no profile data from the retired login remains visible.

## Persistence and ownership

Better Auth owns the `user`, `session`, `account`, and `verification` tables.
Bento's migrations add:

- `lunch_money_connection`, with a foreign key to its Bento user.
- `bento_user_context`, containing the user's active connection.
- `connection_feature_setting`, keyed by user, connection, and feature key.

Every connection query includes the authenticated Better Auth user ID. API
routes return `404` rather than accepting a connection owned by another user.
Client caches use `<bento-user-id>:<connection-id>` as a non-secret data scope
and are remounted when that scope changes.

## Credential handling

When a user adds an API key, the server first verifies it with Lunch Money's
`/me` endpoint. The key is encrypted with AES-256-GCM using
`BENTO_CREDENTIAL_ENCRYPTION_KEY`, or `BETTER_AUTH_SECRET` when a separate key
is not configured. Only ciphertext is stored in SQLite.

The browser receives public connection metadata but never receives a saved
credential. Lunch Money reads and writes go through the authenticated
`/api/lunch-money` route, which checks connection ownership before decrypting a
credential. The allowed RPC operations are explicitly listed server-side.

## Provider and OAuth migration

Better Auth's `account` table owns sign-in-provider identities independently of
Bento's Lunch Money connections. Google currently creates the Bento user. When
Lunch Money OAuth becomes available, one authorization callback can do both:

1. create or resolve the Better Auth user through the Lunch Money provider;
2. upsert that Lunch Money account's `lunch_money_connection`; and
3. select the connection in `bento_user_context`.

An existing Google-authenticated user should add Lunch Money through an
explicit account-linking flow. Do not merge users by an unverified matching
email address. A returning user can then use Lunch Money itself as the sole
sign-in provider, while users who previously linked Google keep both provider
accounts attached to the same Bento user.

The connection record already has an `authMethod` discriminator. The OAuth
flow can store encrypted access/refresh credentials in the same server-only
field without changing connection ownership, active-account switching,
feature settings, or client cache scopes. Token refresh belongs in the server
connection resolver; OAuth credentials must never be returned through the
connections API.

Provider-specific code stays behind two boundaries:

- `lib/server/identity-provider.ts` configures the current Better Auth identity
  provider.
- `lib/server/lunch-money-client.ts` turns a stored connection credential into
  a Lunch Money API client.

The future OAuth implementation belongs in those adapters and its callback;
pages, account switching, feature settings, and browser RPC do not need to
change.

The API-token UI is intentionally presented as a temporary connection method,
not as the user's Bento identity.

## Operations

- Copy `.env.example` to `.env.local` and set `BETTER_AUTH_SECRET`,
  `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`.
- `pnpm dev` uses a locally persisted Durable Object under `.cloudflare/state/`.
- The object applies unapplied SQL migrations transactionally when it starts,
  both locally and after deployment.
- `pnpm db:verify-migrations` applies and verifies committed migrations in an
  isolated local SQLite database; the running app migrates its own object on
  startup.
- Retain the credential-encryption secret. Losing or changing it makes stored
  Lunch Money credentials unreadable.

The app uses one named Durable Object for its shared identity and connection
database. Existing SQLite files or D1 databases need a separate import if their
data must be retained.
