# Bento Cash Web — CLAUDE.md

# General Claude Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Project Overview

A Next.js 16 web frontend for [Lunch Money](https://lunchmoney.app) that provides richer analytics and a faster daily-use interface than the Lunch Money native UI.

## Stack

| Layer     | Choice                                                                                |
| --------- | ------------------------------------------------------------------------------------- |
| Framework | Next.js 16 (App Router, Turbopack)                                                    |
| Language  | TypeScript (strict)                                                                   |
| Styling   | Tailwind CSS v4 + shadcn components                                                   |
| LM SDK    | `@lunch-money/lunch-money-js-v2`                                                      |
| Icons     | lucide-react                                                                          |
| Fonts     | Public Sans (body), Geist Mono (mono), Playfair Display (headings via `font-heading`) |

## Running

```bash
npm run dev        # dev server with Turbopack
npm run typecheck  # tsc --noEmit
npm run lint
npm run format
```

## Architecture

All data fetching is **client-side only** — there is no server component, API route, or backend. The app is effectively a static shell that reads a Lunch Money API token from `localStorage` and calls the LM API directly from the browser.

```
localStorage["lm_token"]
       ↓
hooks/use-token.ts          # reads/writes the token
       ↓
lib/lunchmoney/client.ts    # thin wrapper around LunchMoneyClient
       ↓
app/*/page.tsx              # pages fetch data, compute analytics, render
```

### No server-side secrets

The LM API token lives in `localStorage`. There is no `.env`, no server, no proxy. This is intentional — the app is meant to be self-hosted or run locally.

---

## Key Files

### `hooks/use-token.ts`

SSR-safe hook that reads `localStorage["lm_token"]` in a `useEffect` (avoids hydration mismatch). Exposes `{ token, setToken, clearToken }`. Every page gates rendering on `if (!token)` and shows a link to `/settings`.

### `hooks/use-accounts.ts`

Account balances plus the user's primary currency — the pair the dashboard, accounts and investments pages all need. Each page used to fetch both for itself; both requests are cached at the client boundary, so mounting this in several places costs one round-trip per session.

### `hooks/use-investable-months.ts`

The `investable_months` setting, shared by the settings and accounts pages. Backed by `useSyncExternalStore` so the two stay in agreement and SSR gets a defined snapshot — reading localStorage during render would mismatch the prerendered HTML.

### `lib/lunchmoney/client.ts`

Thin wrappers around `LunchMoneyClient` from `@lunch-money/lunch-money-js-v2`. The client is cached per token in a module-level singleton (`_client`, `_clientToken`) so navigating between pages doesn't create a new instance each render.

Exported functions:

| Function                                        | SDK call                                             | Notes                                               |
| ----------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| `getMe(token)`                                  | `user.getMe()`                                       | Returns `UserInfo` including `primary_currency`     |
| `getTransactionsForMonth(token, year, month)`   | `transactions.getAll()`                              | Sorts by `created_at` desc; limit 250               |
| `getCategories(token)`                          | `categories.getAll()`                                | Returns `{ categories: Category[] }`                |
| `getAccounts(token)`                            | `manualAccounts.getAll()` + `plaidAccounts.getAll()` | Both fetched in parallel                            |
| `getRecurringItems(token)`                      | `recurringItems.getAll()`                            | Returns LM's native recurring item list             |
| `getBalanceHistory(token)`                      | `rawClient.GET("/balance_history")`                  | Every month of balance history, for every account   |
| `getBudgetSummary(token, year, month)`          | `summary.get()`                                      | Budget vs. actual per category                      |
| `updateTransactionCategory(token, txId, catId)` | `transactions.update()`                              | Writes back to LM; `catId=null` clears the category |
| `updateTransactionPayee(token, txId, payee)`    | `transactions.update()`                              | Renames a transaction's description                 |

### `lib/lunchmoney/cache.ts`

Request cache sitting at the client boundary, so every page gets it for free. Entries are keyed by request (`tx:2026-8`, `categories`, `budget:2026-8`, `balance-history`, …) and live for 5 minutes. Before it, every month change refetched everything — including categories and recurring items, which don't depend on the month — so stepping back to a month you had just viewed cost a full round-trip.

It caches the _promise_, not the resolved value, so the dashboard's current-month and previous-month requests share one fetch when they overlap. Rejections are evicted so a failure isn't served to the next caller. `setActiveClient` clears the whole cache, which is what keeps one account's data from surviving into another's session; a transaction write invalidates `tx:` and `budget:` (local state is already patched optimistically, so this only governs the next fetch).

### `lib/lunchmoney/analytics.ts`

Pure functions that operate on already-fetched transaction arrays. No API calls here.

| Function                                     | Purpose                                                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `buildCategoryMap(res)`                      | Flattens nested LM category tree into `Map<id, CategoryInfo>` (handles category groups with children) |
| `filterExpenses(txs)`                        | Keeps only transactions with `amount > 0` (LM: positive = expense, negative = income)                 |
| `computeCategoryTotals(txs, catMap, limit?)` | Groups expenses by category, sorts by spend desc. Skips categories with `exclude_from_totals=true`    |
| `computeMerchantTotals(txs, limit?)`         | Groups expenses by `payee`, sorts by spend desc                                                       |
| `computeDailySpend(txs, year, month)`        | Returns `{date, amount}[]` for every day of the month (zero-filled so charts have full x-axis)        |
| `computeMoMDeltas(current, prev)`            | Returns `Map<categoryId, MoMDelta>` with `pct` change (null when prev spend = 0)                      |
| `countUncategorized(txs, catMap)`            | Count of expense transactions with no category_id                                                     |
| `getTransactionsForCategory(txs, catId)`     | Top 5 transactions for a category by amount (used for category drill-down)                            |
| `computeCumulativeSpendComparison(...)`      | Day-by-day cumulative spend for the month vs. the previous one, on one axis                           |
| `getRecentTransactions(txs, limit?)`         | Most recent non-pending transactions, newest first                                                    |
| `computeMonthTotals(txs, catMap)`            | Income and spend totals for a month, both positive; used for the cash flow comparison                 |

### `lib/lunchmoney/net-worth-history.ts`

Turns LM's `/balance_history` response — per-account monthly balance snapshots — into month-end net worth. `computeNetWorthHistory(history, accounts)` sums each month's balances in `to_base`, splitting assets from liabilities; the history response identifies an account but not its type, so manual and Plaid sources are looked up in the accounts list, crypto counts as an asset, and a deleted account uses the type LM archived with it. `trailingMonths(points, endMonth, count)` takes the window the hero draws.

Two rules about missing months, because LM omits months an account has no data for. A gap _inside_ an account's range carries the last known balance forward — the account existed, it just wasn't snapshotted, and zeroing it would draw a cliff that never happened. A month outside that range contributes nothing: the account didn't exist yet, or stopped being tracked. Unlike `computeNetWorth`, closed accounts aren't filtered out — their balance was real in the months it was recorded, and dropping it would rewrite history every time an account is closed.

### `lib/lunchmoney/categories.ts`

Defines `CategoryInfo` interface and the `UNCATEGORIZED` sentinel object.

### `lib/lunchmoney/category-icons.ts`

Maps lowercase category name keywords → Lucide icon components. `getCategoryIcon(name)` first does an exact lookup, then a substring match, then falls back to `Receipt`. Add entries to `CATEGORY_ICON_MAP` to support new category names.

### `lib/lunchmoney/category-colors.ts`

`categoryColor(name)` hashes a category (or merchant) name to one of the seven `--cat-*` custom properties defined for both themes in `globals.css` (the dashboard's original spend colors, lifted slightly in dark mode). Hashing rather than indexing by position keeps a category's color stable when the spend ranking reshuffles between months.

### `lib/motion.ts`

`EASE` (a quart ease-out) and `DURATION` (`expand` 0.26s, `collapse` 0.2s, `quick` 0.15s). Every transition in the app pulls from these — expanding rows, drill-down panels, the nav pill, list entries — so motion reads as one system. Collapsing is faster than expanding on purpose: nobody wants to wait to dismiss something.

`AnimatedCollapse` (`components/animated-collapse.tsx`) is the shared expand/collapse. Height and opacity run on different clocks: the box opens over the full duration while the content fades in over the back half, so content arrives in an open container rather than appearing stretched. Anything below it reflows along with the height, which is what makes surrounding cards slide rather than jump.

### `lib/format.ts`

| Function                              | Purpose                                                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `formatAmount(n, exact?)`             | Always USD; `exact=true` shows cents                                                                        |
| `formatCurrency(n, currency, exact?)` | Uses `Intl.NumberFormat` with the given ISO currency code; falls back to `"N.NN CUR"` for unsupported codes |
| `formatShortDate(dateStr)`            | `"Apr 3"` format; uses noon UTC to avoid timezone-off-by-one                                                |

---

## Pages

### `/` — Dashboard (`app/page.tsx`)

The main analytics view. Fetches current month + previous month transactions in parallel (for MoM deltas), plus categories, recurring items, and budget summary (last two are non-blocking — loaded after the main render).

**Sections, top to bottom:**

1. **Header** — page title and month selector (prev/next chevrons; future months disabled)
2. **Uncategorized banner** — shown when any transaction has no `category_id`; links to `/transactions`
3. **Net Worth hero** — real net worth over the twelve months ending at the selected one, from LM's `/balance_history` (`net-worth-history.ts`), with the change since the previous month. The headline is today's assets − liabilities from the accounts endpoint when the current month is selected — the same figure the accounts page shows, and the only one that means "right now" — and that month's stored snapshot otherwise. The whole history is fetched once rather than per month, so stepping through months draws from data already in hand.
4. **Cash flow** — surplus/deficit headline, savings rate, income and spend each measured against the same figure last month, a green/red proportion bar, and last month's closing net. The direction arrow's color depends on the row: more income is good news, more spend isn't
5. **Quick Stats** — 4 tiles: Income, Spend, Avg/Day, Peak Day; clicking Income/Spend/Peak opens a drill-down transaction table
6. **Spending** — cumulative spend for the month drawn against the previous month on one axis (`computeCumulativeSpendComparison`); the current line stops at today rather than flatlining
7. **Top expense categories** — each row's colored pill doubles as the bar (width = share of the largest category, `min-width: fit-content` keeps small ones readable); expandable to the top 5 transactions; MoM delta badge
8. **Top merchants** — full width of the wide column; merchants ranked by spend with a bar and transaction count
9. **Budget** — only rendered when the user has budgets configured in LM; ring gauge for the month total, then spend vs. budget per category
10. **Upcoming bills** — LM recurring items (`status="reviewed"` only) with cadence and, when LM provides `matches.expected_occurrence_dates`, the next expected date; amounts normalized to a monthly equivalent
11. **Transactions** — the month's most recent activity with category icons

**LM sign convention:** positive `amount` = expense, negative `amount` = income/credit.

### `/transactions` — Transaction List (`app/transactions/page.tsx`)

Full searchable, filterable, sortable transaction list for a given month.

- **Search** — filters by payee or notes (case-insensitive substring)
- **Category filter** — dropdown of categories present in that month's data; "Uncategorized" option filters to `category_id == null`
- **Sort** — payee, date, amount; toggle asc/desc
- **Inline description edit** — click the payee → it becomes an input in place. Enter or blur commits, Escape reverts. (`components/transactions/editable-text.tsx`)
- **Category picker** — click the category chip → a searchable list (`components/transactions/category-picker.tsx`). The tree is flattened into one flat list with the group name on each row, because typing three letters beats scrolling to the right group. Typing then pressing Enter takes the top match; arrow keys and clicking work as usual. Tab order runs description → category → next row's description
- **Every edit is optimistic** — local state updates immediately and the request goes out after. A failure rolls the row back to its previous values and shows "Couldn't save" on it, so an edit is never silently lost. All three fields (description, category, notes) go through the same `save()` helper
- **Notes** — click a row to expand its detail panel; `⌘/Ctrl + Enter` saves and closes, `Escape` cancels. On small screens the panel also carries the category picker, since the row's category cell is hidden there
- **Keyboard** — `/` focuses search (`Esc` clears it and lets go), `[` and `]` step months. All are ignored while typing, so they never eat input
- **Clearing the uncategorized queue** — when the Uncategorized filter is on, categorizing a row moves focus to the next row's picker, so `Enter → type → Enter` repeats without touching the mouse. Focus targets a specific transaction id rather than a row index, because the categorized row lingers in the DOM for its exit animation. Outside that filter focus is left alone, where moving it would be surprising
- **Footer** — shows transaction count and total spend for the current filtered view

Rows live in `components/transactions/transaction-row.tsx` and are memoized. The page re-renders on every keystroke in the search box, so the row callbacks are wrapped in `useCallback` and the filtered list is mirrored in a ref — without stable identities the memo would never hit and each character would re-render every visible row, picker and collapse included.

### `/accounts` — Accounts (`app/accounts/page.tsx`)

Shows net worth hero (assets − liabilities), grouped by institution within Asset/Liability sections. Handles Plaid (live-synced) and manual accounts. Revoked Plaid accounts show `—` for balance. Displays `last_update` as relative time.

### `/settings` — Settings (`app/settings/page.tsx`)

Token entry form. On submit, calls `getMe()` to verify the token, then stores it via `useToken`. Shows user name, budget name, primary currency, and API key label when connected.

---

## UI Components

Only shadcn-installed components are used. No custom UI primitive files should be created — install via `npx shadcn add <component>` instead.

One exception: `components/ui/combobox.tsx`. The category picker needs a searchable select, and `npx shadcn add command popover` cannot reach the registry from the sandboxed dev environment (the proxy 403s `ui.shadcn.com`). It wraps `@base-ui/react`'s Combobox — the same primitive the generated `select.tsx` uses — and mirrors that file's popup styling. If the registry becomes reachable, replacing it with the generated component is the better path.

Current installed components in `components/ui/`:

- `button` — includes `icon-sm` size variant
- `card` — `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`, `CardDescription`
- `input`
- `kbd`
- `combobox` — see the exception noted above

Theme is defined in `app/globals.css` using CSS custom properties (oklch color space). Dark mode via `next-themes` with class strategy. Toggle: press `d` or use the header button.

**Surfaces are translucent.** A fixed ambient wash (`body::before`, radial gradients tinted with `--primary` and the chart hues) sits behind the page, and every raised surface — cards, the transaction list, drill-down panels, chart tooltips, the header — is a pane of glass over it. The material lives in one Tailwind utility, `glass`: translucent fill, hairline ring, lit top edge. Use it rather than reaching for `bg-card` + blur classes, so all surfaces stay the same sheet.

**`glass` deliberately has no backdrop-filter** — don't add one back. What sits behind these panels is the ambient wash, a smooth gradient, so blurring it is visually a no-op; but it forces every panel to re-sample and re-blur its backdrop on every frame that anything moves. Measured on an expanding category row, that was the difference between 22fps and 63fps. Surfaces that sit over genuinely _varying_ content add `glass-blur` alongside `glass` — chart tooltips do, and the sticky header carries its own blur — because there the blur is both visible and cheap.

The light page carries a faint tint (`--background` sits just below white, in the same neutral ramp as `--sidebar`) rather than being paper-white — glass over pure white is invisible, so the tint is what the cards separate from.

Two consequences to keep in mind when adding UI:

- Fills that sit **on** glass should be translucent too — `bento-raised` for row hovers and skeletons, `bento-hairline` for progress tracks. An opaque fill reads as a patch stuck on the pane.
- Charts pull `--series-1` / `--series-2`, not `--chart-1` directly. The chart ramp is amber, and its bright end is unreadable as a line on a white surface, so light mode maps the series to the ramp's darker steps and dark mode to its brighter ones.
- Category chips tint with the category's own color: `color-mix(in oklab, <color> var(--chip-tint), transparent)`. `--chip-tint` is per-theme (26% light, 34% dark) because a tint over dark glass needs more strength to read.

App code should use the semantic `bento-*` tokens rather than raw Tailwind palette colors, so both themes stay in sync:

| Token                               | Use                                                     |
| ----------------------------------- | ------------------------------------------------------- |
| `bento-base` / `bento-surface`      | page background / card background                       |
| `bento-glass` / `bento-raised`      | translucent panel fill / translucent overlay on a panel |
| `bento-default` / `bento-subtle`    | primary / secondary text                                |
| `bento-hairline` / `bento-muted`    | borders and tracks / muted fills                        |
| `bento-brand` / `bento-brand-fg`    | brand accent and text on it                             |
| `bento-positive` / `bento-negative` | money in / money out, under / over budget               |
| `cat-1` … `cat-7`                   | category accents (see `category-colors.ts`)             |

---

## Data Flow Patterns

### Loading state is derived, never flagged

Both data hooks track _which month is on screen_ (`loadedMonth`) and tag failures with the month they belong to, instead of toggling a `loading` boolean. Loading is then `loadedMonth !== selectedMonth && that month hasn't failed` — there's no flag to get out of sync, and no `setState` at the top of an effect. Each fetch also carries a `cancelled` flag, so a slow response for a month the user has already left can't overwrite the month they're now looking at.

### Month changes keep the current view

Both pages treat a month change as a refresh of what's on screen, not a reload: the previous month's content stays put with a small spinner by the month label, and skeletons appear only on a first load when there is nothing to keep. `useMonthNavigation` runs the change inside `useTransition` — re-rendering a month of cards and charts is a ~170ms job, and as a blocking update it froze the UI between click and content. As a transition React slices it (measured: one 170ms task became two of ~70ms), so the arrows stay responsive.

### Parallel fetching

Pages fetch all required data in a single `Promise.all` inside a `useEffect`. Non-critical data (recurring items, budget summary) is fetched separately and doesn't block the main loading state.

```ts
Promise.all([
  getTransactionsForMonth(token, year, month),
  getTransactionsForMonth(token, prevYear, prevMonth),
  getCategories(token),
]).then(([txRes, prevTxRes, catRes]) => { ... })

// Non-blocking, after main data loads:
getRecurringItems(token).then(setRecurringItems).catch(() => {})
getBudgetSummary(token, year, month).then(setBudgetSummary).catch(() => {})
```

### Optimistic category updates

When a user reassigns a category in the UI, the local `transactions` state is updated immediately after the API call resolves — no full re-fetch. The `updateTransactionCategory` call goes to LM, then `setTransactions(prev => prev.map(...))` patches the local array.

### Amount sign convention

LM API returns `amount` as a string. **Positive = expense, negative = income.** All analytics functions call `filterExpenses` (which checks `parseFloat(tx.amount) > 0`) before processing spend data.

---
