# Incremental spending dashboard rollout

These are implementation prompts for adopting the experimental spending dashboard one module at a time. Each numbered file contains a complete prompt to paste into a separate Codex task. The prompts are instructions for future work, not approval to execute the whole rollout now.

## What stays here

The working prototype remains in `/Users/chintan/.codex/worktrees/3789/bento-cash-web`. Its application changes are uncommitted; this documentation commit includes only this prompt directory. Keeping that worktree intact preserves the local implementation. The prompts are self-contained so they can also be used without local access to the prototype. Do not merge this old checkout into main to ship the dashboard.

Reference files in the prototype:

- `app/page.tsx`: experimental page composition.
- `components/dashboard/spending-dashboard.tsx`: summary, filters, history, insights, category explorer, calendar, and supporting purchases. Extract individual modules; do not copy it wholesale.
- `lib/lunchmoney/spending-insights.ts`: reporting selectors and initial merchant-outlier detection.
- `hooks/use-spending-history.ts`: initial selected-month historical loader.
- `hooks/use-dashboard-data.ts`: local reporting-cutoff and budget-result changes.
- `lib/lunchmoney/__tests__/spending-insights.test.ts`: initial math fixtures.

The prototype is a product reference, not a production-ready migration patch. The prompts explicitly improve its handling of unavailable historical months, authenticated data scopes, midnight date changes, and exact-purchase evidence.

## Run in this order

| Step | Prompt                                                                   | Prerequisite                            | Reviewable change                                                                      |
| ---- | ------------------------------------------------------------------------ | --------------------------------------- | -------------------------------------------------------------------------------------- |
| 01   | [Reporting foundation](01-reporting-foundation.md)                       | None                                    | Shared spending rules, elapsed-day comparisons, and reporting cutoff; no layout change |
| 02   | [Summary and spending modes](02-summary-and-spending-modes.md)           | 01                                      | Headline, daily average, expense/no-spend counts, and all/flexible/recurring controls  |
| 03   | [History and monthly average](03-history-and-monthly-average.md)         | 01–02                                   | Scoped history loading, 6M/12M chart, and explicitly defined average                   |
| 04   | [Category explorer and purchases](04-category-explorer-and-purchases.md) | 01–03                                   | Search/sort, category trends, chart selection, and supporting purchase list            |
| 05   | [Calendar and day drill-down](05-calendar-and-day-drilldown.md)          | 01–04                                   | Daily heatmap and day filtering in that same purchase list                             |
| 06   | [Insights and evidence](06-insights-and-evidence.md)                     | 01–05                                   | Explained category changes and unusual purchases with inspectable evidence             |
| 07   | [Optional dashboard composition](07-optional-dashboard-composition.md)   | 01–06 plus a deliberate layout decision | Adopt the full spending-first hierarchy using the already-reviewed modules             |

The pairings keep each addition usable: filters ship with the summary they change; history ships with its average; category exploration ships with its purchases; the calendar reuses that drill-down; and insights ship with their evidence paths. Every completed step is a stopping point. Step 07 is optional; the functional modules can stay inside the existing Overview.

## Workflow for each prompt

1. Start a separate task in a target checkout based on the latest main, with preceding steps already merged. Create one `codex/` feature branch per step. Do not implement in the prototype worktree.
2. Paste the contents after the horizontal rule in the numbered file. Each prompt repeats its prerequisites, source references, scope constraints, and verification expectations so it works independently.
3. Review the resulting focused change and its validation before deciding to merge it through the normal workflow. The prompt does not authorize a merge, push, deployment, or later step.
4. Continue with the next step only when ready. A later prompt must adapt to what actually landed, including differences from suggested component names.

No implementation source changes belong in a commit that only transports these prompts. To bring the prompts themselves to a target branch, apply only this directory or cherry-pick the documentation-only commit after inspecting its file list. That does not ship any dashboard behavior.

## Main has evolved

At authoring time (November 7, 2026), local main was `3250046` (`Add transaction deletion support`), while this experimental worktree started at `22ee347`. Reinspect main before implementing any step; those commits are context, not pinned rollout bases.

The inspected main uses `useAuth`, `hasDataSource`, and `dataScopeKey`; a Vite/vinext/Cloudflare runtime; scoped dashboard requests with independent comparison loading/failure; keyed budget results; a separate Reports spending view; and newer transaction capabilities. Preserve those systems. In particular:

- Do not replace main’s dashboard hook with the prototype’s older boolean-auth hook or grouped current/previous fetch.
- Do not regress unavailable comparisons to zero or duplicate protections already implemented on main.
- Do not port the old Next.js package setup, obsolete `useToken`, or outdated connection UI.
- Share applicable analytics with Reports when safe, but preserve its complete-month reporting semantics and avoid unrelated redesigns.
- Follow the current `AGENTS.md` and package scripts. Use `pnpm`/`pnpm exec`; check port 3000 and reuse an existing app server as instructed.

## Reporting contract across modules

- Use converted `to_base` values in the primary currency. Gross spending includes positive posted expenses and excludes pending, future-dated, and excluded-category entries. Income/refunds are not netted into it; raw transaction data remains editable.
- Recurring is a linked recurring item (`recurring_id != null`); all spending equals flexible plus recurring.
- Compare matching elapsed days for the current month and complete periods for closed months. Keep chart totals distinct from comparable-period totals.
- Missing/failed history is unavailable, not a zero-spend month. Every average, change, mini chart, and signal must respect this distinction and authenticated data scope.
- Share one reporting state/data flow. Category selection clears the day; day selection clears the category; unusual-purchase evidence may intentionally set both and identify the specific transaction.
- Every visible module needs useful empty/error/loading behavior, theme/keyboard/mobile support, and a verifiable path from a claimed amount to its included transactions.
