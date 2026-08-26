# TODO

Running list of what's next. Roughly ordered by value within each section.

## Known limitations

Things that are working as designed but worth revisiting.

- **Net worth history only goes back as far as LM's.** The hero now draws real
  month-end net worth from `/balance_history`, but an account LM never
  snapshotted contributes nothing to the months before its first entry, so a
  recently-added account makes the early curve read low. LM's own upsert
  endpoint (`PUT /balance_history/...`) could backfill it; nothing in the app
  writes balance history today.
- **`components/ui/combobox.tsx` is a hand-rolled exception** to the
  "shadcn components only" rule. It was written when `npx shadcn add command
popover` could not reach `ui.shadcn.com` from the sandboxed dev environment;
  the registry _is_ reachable from a normal dev machine, so the swap is now
  actionable rather than blocked. It isn't mechanical: `category-picker.tsx`
  is built on this component and is the flow most worth not regressing, so it
  wants its own pass with the editing flows exercised by hand.
- **Failed saves can't be exercised in demo mode.** The demo client always
  resolves, so the optimistic rollback path on the transactions page only ever
  runs against the real API. Either give the demo client an opt-in failure mode
  or lift `save()` somewhere it can be unit-tested.
- **Only `status: "reviewed"` recurring items appear** in Upcoming bills.
  LM's "suggested" items are its own guesses; surfacing them would need a
  review affordance.

## Bugs and correctness

- `useAccounts` never retries after a failed request — the error sticks for the
  session and the only way out is a reload. Needs a retry path, or refetch when
  the page regains focus.
- Rolling back a failed save restores the row as it was when _that_ edit
  started. Two quick edits to the same row, where the first fails after the
  second succeeds, would take the second edit down with it.
- `growth-projection.tsx` reads `monthly_contribution` from `localStorage` in a
  render-time initializer. It doesn't currently mismatch, because the auth gate
  keeps the component out of the server render — but it's the same pattern
  `useInvestableMonths` exists to avoid, and it will bite if that gate moves.
- No error boundary. A render error in any card blanks the whole page.

## Portfolio

- **Real returns need snapshots.** The portfolio view shows contributions
  because Lunch Money has no cost basis or price history. Recording the
  portfolio total once a month (localStorage, or a file the user exports) would
  make a genuine time-weighted return possible from then on — but only on the
  device that recorded it.
- **Per-holding detail is not possible** through the Lunch Money API: it has no
  holdings, tickers, share counts or cost basis. Anything at position level
  would need a second data source (Plaid Investments directly, or a
  broker/price API), which is a much bigger change than a UI one.
- The allocation ring colors come from hashing the account name, so two
  accounts can collide on a color. A per-slice palette walk would avoid it.

## Features

- **Bulk edit** — select multiple transactions and categorize them in one go.
  The single-row flow is fast now; the queue-clearing case is where volume
  lives.
- **Reviewed / unreviewed transactions** — the API returns
  `status: "reviewed" | "unreviewed" | "delete_pending"` on every transaction
  and `getTransactionsForMonth` already fetches it unfiltered, but nothing in
  the app reads or writes it. Showing a badge on unreviewed rows and filtering
  to them is free from data we hold; marking a row reviewed needs a new
  `updateTransactionStatus` in the client plus the optimistic-update and
  rollback path the category edit uses. Note pending transactions always come
  back `unreviewed`, so a review queue needs to decide whether to include them
  — everywhere else the app excludes `is_pending`.
- **Rules** — "always categorize Whole Foods as Groceries". LM has a rules API;
  applying one from a transaction row is the natural entry point.
- **Split transactions** — LM supports children; the app treats every
  transaction as atomic.
- **Search across months.** Search is client-side over the loaded month only.
- **Budget editing** — budgets are read-only today.

## Testing

- Component tests: none. The analytics, format and cache modules are covered;
  every component is verified by hand or with an ad-hoc Playwright script.
  Worth a real Playwright suite in-repo covering the editing flows, since those
  are the ones that touch the live API.
- Demo data has no pending transactions, so the pending-exclusion behavior
  (which was wrong until recently) is only pinned by unit tests.

## Housekeeping

- `lib/account-utils.ts` carries three open questions in comments: whether
  vehicles and real estate count as liabilities, typing `subtype` properly, and
  `formatUpdated` not showing the year for dates outside the current one.
- The Vercel Analytics script 404s outside Vercel. Harmless, but it's noise in
  every local console.
