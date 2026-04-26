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
| `getBudgetSummary(token, year, month)`          | `summary.get()`                                      | Budget vs. actual per category                      |
| `updateTransactionCategory(token, txId, catId)` | `transactions.update()`                              | Writes back to LM; `catId=null` clears the category |

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

### `lib/lunchmoney/categories.ts`

Defines `CategoryInfo` interface and the `UNCATEGORIZED` sentinel object.

### `lib/lunchmoney/category-icons.ts`

Maps lowercase category name keywords → Lucide icon components. `getCategoryIcon(name)` first does an exact lookup, then a substring match, then falls back to `Receipt`. Add entries to `CATEGORY_ICON_MAP` to support new category names.

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

1. **Month selector** — prev/next chevrons; future months disabled
2. **Uncategorized banner** — amber alert shown when any expense transaction has no `category_id`; links to `/transactions`
3. **Quick Stats** — 4 cards: Total Income, Total Spend, Avg Spend/Day, Peak Day
4. **Net Cash Flow bar** — green/red split bar showing income vs. spend proportion; surplus/deficit label
5. **Daily Spend chart** — bar-per-day for the selected month; hover tooltip
6. **Spend by Category** — ranked list with colored progress bars; each row is expandable (click → shows top 5 transactions inline, with clickable category labels that open an inline `<select>` to reassign category, writing back to LM); MoM delta badge on each category
7. **Top Merchants** — ranked by spend with progress bars and transaction count
8. **Budget Progress** — only rendered when the user has budgets configured in LM; shows spend vs. budget per category with red bar when over budget
9. **Subscriptions & Recurring** — sourced from LM's recurring items API (not computed locally); only `status="reviewed"` items shown; amounts normalized to monthly equivalent; total shown in header

**LM sign convention:** positive `amount` = expense, negative `amount` = income/credit.

### `/transactions` — Transaction List (`app/transactions/page.tsx`)

Full searchable, filterable, sortable transaction list for a given month.

- **Search** — filters by payee or notes (case-insensitive substring)
- **Category filter** — dropdown of categories present in that month's data; "Uncategorized" option filters to `category_id == null`
- **Sort** — payee, date, amount; toggle asc/desc
- **Inline category edit** — click a category label → `<select>` dropdown → `onChange` immediately calls `updateTransactionCategory` and updates local state optimistically
- **Footer** — shows transaction count and total spend for the current filtered view

### `/accounts` — Accounts (`app/accounts/page.tsx`)

Shows net worth hero (assets − liabilities), grouped by institution within Asset/Liability sections. Handles Plaid (live-synced) and manual accounts. Revoked Plaid accounts show `—` for balance. Displays `last_update` as relative time.

### `/settings` — Settings (`app/settings/page.tsx`)

Token entry form. On submit, calls `getMe()` to verify the token, then stores it via `useToken`. Shows user name, budget name, primary currency, and API key label when connected.

---

## UI Components

Only shadcn-installed components are used. No custom UI primitive files should be created — install via `npx shadcn add <component>` instead.

Current installed components in `components/ui/`:

- `button` — includes `icon-sm` size variant
- `card` — `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`, `CardDescription`
- `input`
- `kbd`

Theme is defined in `app/globals.css` using CSS custom properties (oklch color space). Dark mode via `next-themes` with class strategy. Toggle: press `d` key.

---

## Data Flow Patterns

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
