# Authentication architecture

Bento Cash uses [Better Auth](https://www.better-auth.com/) with a SQLite-backed
Cloudflare Durable Object. The system separates identity from financial-data access:

- **Bento user** — a Lunch Money-backed identity with a server-managed session.
  Bento does not accept passwords.
- **Lunch Money connection** — one budgeting account linked to that Bento user
  through OAuth. Previously saved API-key connections remain usable.

Migration `003_google_identity_migration.sql` retired the old email/password
prototype. Google sign-in is now disabled, but existing Google-backed Bento
users and their connections remain. Better Auth links a Lunch Money identity
to one of those users when the normalized, verified emails match. A different
email cannot claim that account. The Lunch Money user ID becomes the stable
OAuth provider subject; the selected budget's `account_id` identifies its
connection.

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

When a user signs in, Better Auth exchanges the authorization code with PKCE
and client-secret Basic authentication. The completion route verifies `/v2/me`
before persisting a connection. OAuth credentials are encrypted with AES-256-GCM using
`BENTO_CREDENTIAL_ENCRYPTION_KEY`, or `BETTER_AUTH_SECRET` when a separate key
is not configured. Better Auth's temporary provider tokens are encrypted too.

The browser receives public connection metadata but never a saved credential.
Lunch Money reads and writes go through the authenticated
`/api/lunch-money` route, which checks connection ownership before decrypting a
credential. The allowed RPC operations are explicitly listed server-side.

## OAuth sign-in and connection

Better Auth's `account` table owns sign-in-provider identities independently of
Bento's Lunch Money connections. One Lunch Money authorization now does both:

1. create or resolve the Better Auth user through the Lunch Money user ID and
   authenticated Lunch Money email;
2. verify the returned user ID and selected `account_id` with `/v2/me`, then
   upsert the encrypted connection; and
3. select it in `bento_user_context`.

Google provider accounts stay attached to their original Bento users for
ownership and settings continuity, but Google is not offered for sign-in.
New budget connections use OAuth. Existing API-key connections remain usable
until reauthorized with OAuth.

Lunch Money's OAuth preview grants every scope registered on the client. It
ignores a narrower `scope` authorization parameter; changing the scope set
requires registering a replacement client and updating its credentials.

The connection record stores the Lunch Money user ID and encrypted access and
refresh credentials. Refresh-token rotation is claimed with a database
compare-and-swap before the token is sent. If a refresh response is lost, the
claim remains and the user must reauthorize instead of replaying the consumed
token. Reauthorization clears the claim. API-key connections keep their
existing ownership, settings, and cache scopes.

Provider-specific code stays behind two boundaries:

- `lib/server/identity-provider.ts` configures Lunch Money as the Better Auth
  identity provider.
- `lib/server/lunch-money-client.ts` turns a stored connection credential into
  a Lunch Money API client and coordinates refresh.

`app/api/oauth/lunch-money/complete/route.ts` finishes the connection after
Better Auth sets the Bento session.

## Operations

- Copy `.env.example` to `.env.local` and set `BETTER_AUTH_SECRET`,
  `LUNCH_MONEY_CLIENT_ID`, `LUNCH_MONEY_CLIENT_SECRET`, and
  `LUNCH_MONEY_OAUTH_ISSUER` for the preview.
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
