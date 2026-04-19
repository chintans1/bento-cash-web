# Bento Cash Web — CLAUDE.md

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

### `lib/lunchmoney/balance-history.ts`

Types, fetching, and analytics for the **balance history** endpoint, which lives on a separate testing API (`https://lm-v2-api-next-a7fabcab8e9a.herokuapp.com/v2`). This endpoint is not part of the standard LM SDK.

| Export                            | Purpose                                                             |
| --------------------------------- | ------------------------------------------------------------------- |
| `getBalanceHistory(token)`        | `GET /balance_history` — returns per-source balance snapshots       |
| `computeNetWorthTimeSeries(data)` | Sums all `to_base` values per date → `NetWorthPoint[]`              |
| `BalanceHistoryResponse`          | Full shape of the API response (source types + balance entries)     |
| `NetWorthPoint`                   | `{ date: string, total: number }` — one aggregate snapshot per date |

### `lib/lunchmoney/wealth-analytics.ts`

Pure functions for wealth projections and financial health metrics. No API calls.

| Export                              | Purpose                                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `projectNetWorth(nw, contrib, yrs)` | Compound growth at 4/7/10% → `ProjectionPoint[]` with `conservative/moderate/aggressive` |
| `computeAllocation(accounts)`       | Buckets assets into cash/investments/crypto/property/other → `AllocationSlice[]`         |
| `computeMonthlySummary(txs, ...)`   | Income + expense totals for one month → `MonthlySummary`                                 |
| `computeFIREMetrics(nw, summaries)` | FIRE number, years to FIRE (at 7%), savings rate → `FIREMetrics`                         |

### `lib/chart-utils.ts`

Shared helpers for all hand-rolled SVG chart components. Import here instead of duplicating.

| Export     | Purpose                                                              |
| ---------- | -------------------------------------------------------------------- |
| `niceStep` | Returns a "nice" round step size for a given range and tick count    |
| `niceAxis` | Expands `[lo, hi]` to round bounds and returns evenly-spaced ticks   |
| `fmtAxis`  | Compact currency label for y-axis: `"$120K"`, `"$1.2M"`, `"EUR 500"` |

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

The main analytics view. Fetches current month + previous month transactions in parallel (for MoM deltas), plus categories, recurring items, and budget summary (last two are non-blocking).

**Sections, top to bottom:**

1. **Month selector** — prev/next chevrons; future months disabled
2. **Uncategorized banner** — amber alert when any expense has no `category_id`; links to `/transactions`
3. **Quick Stats** — 4 cards: Total Income, Total Spend, Avg Spend/Day, Peak Day
4. **Net Cash Flow bar** — green/red split bar showing income vs. spend; surplus/deficit label
5. **Daily Spend chart** — bar-per-day for the selected month; hover tooltip
6. **Spending Trends** — side-by-side lists of the fastest-growing and fastest-shrinking expense categories MoM (hidden when no delta data)
7. **Spend by Category** — ranked list with progress bars; expandable rows show top 5 transactions with inline category reassignment
8. **Top Merchants** — ranked by spend with progress bars and transaction count
9. **Budget Progress** — shown only when LM budgets are configured
10. **Subscriptions & Recurring** — LM recurring items; only `status="reviewed"` shown; normalized to monthly

**LM sign convention:** positive `amount` = expense, negative `amount` = income/credit.

### `/transactions` — Transaction List (`app/transactions/page.tsx`)

Full searchable, filterable, sortable transaction list for a given month.

- **Search** — filters by payee or notes (case-insensitive substring)
- **Category filter** — dropdown; "Uncategorized" option filters to `category_id == null`
- **Sort** — payee, date, amount; toggle asc/desc
- **Inline category edit** — click a label → `<select>` → `onChange` calls `updateTransactionCategory` and patches local state
- **Footer** — transaction count and total spend for the filtered view

### `/accounts` — Accounts (`app/accounts/page.tsx`)

Net worth hero (assets − liabilities) with two tabs:

- **Accounts tab** — accounts grouped by institution within Asset/Liability sections. Includes an Investable Cash card (checking surplus above 1-month buffer, once savings emergency fund is met).
- **Net Worth History tab** — line chart from the balance history API. Data is fetched lazily on first visit to the tab and cached for the session.

### `/wealth` — Wealth (`app/wealth/page.tsx`)

Long-form wealth management view. Fetches accounts, categories, and the last 6 months of transactions in a single `Promise.all`.

**Sections:**

1. **Net Worth hero** — current assets − liabilities
2. **Growth Projection** — 3-scenario SVG line chart (conservative 4% / moderate 7% / aggressive 10%). User controls monthly contribution amount and time horizon (10 / 20 / 30 yr). Hover shows per-scenario values at any year.
3. **Portfolio Allocation** — horizontal segmented bar + legend showing how assets break down into cash, investments, crypto, property, and other.
4. **Financial Health (FIRE card)** — FIRE number (25× annual expenses), years to FIRE at moderate growth, savings rate, monthly surplus.
5. **Monthly Cash Flow** — dual-line SVG chart (income vs. expenses) over the last 6 months. Hover shows income, expenses, and net for any month.

### `/settings` — Settings (`app/settings/page.tsx`)

Token entry form. On submit, calls `getMe()` to verify the token, then stores it via `useToken`.

---

## UI Components

Only shadcn-installed components are used. No custom UI primitive files should be created — install via `npx shadcn add <component>` instead.

Current installed components in `components/ui/`:

- `button` — includes `icon-sm` size variant
- `card` — `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`, `CardDescription`
- `input`
- `kbd`

Theme is defined in `app/globals.css` using CSS custom properties (oklch color space). Dark mode via `next-themes` with class strategy. Toggle: press `d` key.

Chart CSS variables used across all SVG charts:

| Variable    | Use                       |
| ----------- | ------------------------- |
| `--chart-1` | Primary line / aggressive |
| `--chart-2` | Secondary / moderate      |
| `--chart-3` | Tertiary / conservative   |
| `--chart-4` | Quaternary (property)     |
| `--chart-5` | Quinary (other)           |

---

## SVG Charts

All charts are hand-rolled SVG — no charting library dependency. They share a common pattern:

1. `niceAxis(lo, hi)` from `lib/chart-utils.ts` computes axis bounds and tick values
2. `xOf(i)` / `yOf(v)` map data → SVG coordinates inside a `<g transform="translate(PAD.left, PAD.top)">`
3. Mouse interaction: `onMouseMove` converts client coordinates to data index via the SVG's `getBoundingClientRect()`
4. All color references use CSS custom properties (`var(--chart-1)` etc.) so dark mode works automatically

| Component                                       | Chart type       | Data type           |
| ----------------------------------------------- | ---------------- | ------------------- |
| `components/dashboard/daily-spend-chart.tsx`    | Bar (CSS flex)   | `DailySpend[]`      |
| `components/accounts/net-worth-chart.tsx`       | Line + area fill | `NetWorthPoint[]`   |
| `components/wealth/growth-projection-chart.tsx` | 3-line + areas   | `ProjectionPoint[]` |
| `components/wealth/cash-flow-chart.tsx`         | 2-line + areas   | `MonthlySummary[]`  |

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

// Non-blocking:
getRecurringItems(token).then(setRecurringItems).catch(() => {})
getBudgetSummary(token, year, month).then(setBudgetSummary).catch(() => {})
```

### Lazy tab data

The Net Worth History chart on `/accounts` only fetches its data when the user first switches to that tab. A `status` field (`"idle" | "loading" | "ready" | "error"`) guards the fetch so it runs exactly once per session.

### Optimistic category updates

When a user reassigns a category, local state is patched immediately after the API call resolves — no full re-fetch.

### Amount sign convention

LM API returns `amount` as a string. **Positive = expense, negative = income.** All analytics functions call `filterExpenses` / `filterSpendTransactions` before processing spend data.

---

## Planned / Future Work

- **AI insights** — natural language spending summaries, anomaly detection, auto-categorization
- **Port to main branch** — current work is on a feature branch; needs review before merge
