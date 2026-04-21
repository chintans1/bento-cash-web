# Plan for what is next?

- [x] Save current branch, move to master
- [x] Add linting
- [x] Fix the transactions fetch, show recent transactions
- [x] Integrate spend by category (omit categories we don't care about)
- [x] Add a range selector, for now its tied to a month.
- [x] Add quick card analytics: income, spend, average spend/day, peak day

- [x] Get most of the current code onto main branch
- [x] Document what is left on the other yolo-branch
- [x] Clean up code, focus on read-mode being perfect, data is accurate
- [ ] Host on Vercel
- [ ] Add tests
- [ ] Add sentry
- [ ] Mobile optimization

- [ ] Top merchants, probably should avoid recurring transactions
- [ ] Spend by category: maybe uncategorized should be last and not shown like that?
- [ ] Peak day: ignore recurring?
- [ ] Average/day: ignore recurring?
- [ ] Spend: show 2 numbers? one excluding recurring?

- [ ] Integrate now top transactions by category
- [ ] Heatmap? (from yolo-mode: `components/spending-heatmap.tsx` — GitHub-style calendar heatmap, 6-month range, color intensity by spend, week hover tooltips, month labels, legend)

## From yolo-mode (not yet on main)

- [ ] `lib/format.ts` — `formatAmount(n, exact?)` (USD, no cents by default) + `formatShortDate(dateStr)` utilities
- [ ] `lib/lunchmoney/analytics.ts` — analytics module: `toYMD`, `filterExpenses`, `computeDailyTotals`, `buildHeatmap`, `computeCategoryTotals`, `computeStats`, plus types `DayCell`, `HeatmapData`, `CategoryTotal`, `AnalyticsStats`
- [ ] `lib/lunchmoney/client.ts` — `getAllTransactions(token, { start_date, end_date })` with automatic pagination (500/page, up to 20 pages)
- [ ] `components/spending-heatmap.tsx` — GitHub-style spending heatmap component (see above)
- [ ] `app/page.tsx` homepage redesign:
  - Fetches 6 months of data via `getAllTransactions`
  - Spending Activity heatmap section
  - 4 quick stats cards (Total Spend, Transactions, Avg/Day, Top Date)
  - Spending by Category: top 7 categories, colored progress bars, category icons
  - Top Transactions: top 8 by amount, "View all →" link to `/transactions`
