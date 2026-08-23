# TODO

Running list of what's next. Roughly ordered by value within each section.

## Known limitations

Things that are working as designed but worth revisiting.

- **Net worth history is derived, not real.** Lunch Money has no historical
  balance endpoint, so the hero's curve walks today's balances back through the
  month's cash flow. It ignores market movement on investment accounts, and a
  past month has no balance to anchor to (it plots cumulative cash flow
  instead). Storing a monthly balance snapshot in `localStorage` would build
  real history going forward, at the cost of only working on the device that
  recorded it.
- **`components/ui/combobox.tsx` is a hand-rolled exception** to the
  "shadcn components only" rule, because `npx shadcn add command popover`
  cannot reach `ui.shadcn.com` from the sandboxed dev environment. Replace it
  with the generated component wherever the registry is reachable.
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

## Features

- **Bulk edit** — select multiple transactions and categorize them in one go.
  The single-row flow is fast now; the queue-clearing case is where volume
  lives.
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
