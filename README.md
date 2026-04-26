# Bento Cash

A richer analytics interface for [Lunch Money](https://lunchmoney.app) — faster daily-use, deeper spending insights, and a cleaner view of your financial picture than the native Lunch Money UI.

![Bento Cash screenshot](public/screenshot.png)

## What it does

- **Dashboard** — monthly spend by category with MoM deltas, daily spend chart, top merchants, budget progress, and recurring subscriptions at a glance
- **Transactions** — searchable, filterable, sortable transaction list with inline category reassignment
- **Accounts** — net worth overview grouped by institution, covering both Plaid-synced and manual accounts
- **Uncategorized alerts** — surfaces transactions missing a category so you can clean them up quickly

## How it works

Bento Cash is a fully client-side Next.js app. There is no backend, no server, and no proxy. Your Lunch Money API token is stored in your browser's `localStorage` and API calls go directly from your browser to Lunch Money.

Nothing leaves your browser except requests to the Lunch Money API.

## Getting started

**Prerequisites:** A [Lunch Money](https://lunchmoney.app) account and an API token (Settings → Developers → Request API Access).

```bash
git clone https://github.com/your-username/bento-cash-web
cd bento-cash-web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), go to Settings, and paste your API token.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Recharts](https://recharts.org)
- [`@lunch-money/lunch-money-js-v2`](https://github.com/lunch-money/lunch-money-js)

## License

MIT
