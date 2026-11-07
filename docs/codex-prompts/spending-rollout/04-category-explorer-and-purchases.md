# Step 04: Category explorer and supporting purchase list

Copy the prompt below into a Codex task in the target checkout.

---

## Working agreement

Implement only this numbered step on a new `codex/` branch based on the current main (including the prerequisite steps already merged). Inspect the current repository and `AGENTS.md` first. Keep the existing Overview layout and unrelated functionality unless this step explicitly changes it. Do not merge, push, deploy, or implement later steps.

The local prototype is reference material at `/Users/chintan/.codex/worktrees/3789/bento-cash-web`, especially `components/dashboard/spending-dashboard.tsx`, `lib/lunchmoney/spending-insights.ts`, and `hooks/use-spending-history.ts`. It contains uncommitted application changes. Read those files directly if available; do not switch or modify that worktree, cherry-pick its application changes, or copy the monolithic dashboard wholesale. If unavailable, implement from the requirements here. Adapt to current main’s authentication, data scope, routing, cache, design tokens, and runtime; the prototype’s old `useToken` and Next.js setup are not migration targets.

Use `pnpm` and `pnpm exec` exclusively. Follow the repository’s port-3000/server-reuse rule. Keep changes in small components and pure selectors. Use existing dependencies. Preserve all current transaction editing, deletion, imports, and authentication behavior.

## Scope and prerequisites

Requires steps 01–03 merged. Implement the explorer and its filtered purchase list together so selecting a category immediately has a useful destination.

## Implement

- Extract a standalone category explorer using the shared spending report/history rather than fetching again. Include every category appearing in the visible reporting history, including categories with zero spending this month, uncategorized spending, and reasonable fallback names for unknown IDs. Never silently truncate to the old top-ten default.
- Each row shows name/icon using existing category tokens, current spend, share of active-mode spending, expense count, six-month mini bars, and absolute change against the comparable previous period. Mark new spending when the available previous total is zero; use an em dash for unavailable comparison. Mini bars use full historical totals and clearly identify a partial current month or unavailable historical slots.
- Add category search and sort by highest spend, biggest absolute change, or name. Search affects the rows only, not the report totals. Keep the ordering stable and empty search results explicit.
- Selecting a category highlights it, filters the monthly-history chart, and exposes a “review purchases” action to the supporting list. The summary remains the total for the active spending mode; label category-specific history and list scope clearly. Clearing the selection restores the full history/list.
- Add a supporting purchase list sorted by largest primary-currency amount, with dates, merchant, category, and recurrence indicator. Show included count and total; expand beyond the first eight purchases in place without dropping filters. Use the same scoped transactions as the selector and accurate singular/plural labels.
- Connect transaction navigation to main’s actual supported route/filter/edit affordances. Preserve month and category in the destination. Do not claim a purchase link opens a specific editor or preserves unsupported filters. Keep the precise filtered list available locally so opening the general Transactions page is optional.
- Use shared category-selection state ready for step 05’s day filter, but do not add a calendar or insight cards. Replace only the equivalent existing category card/duplicate purchase presentation as needed; preserve top merchants and the rest of Overview.

## Acceptance evidence

Verify more than ten categories, disappeared categories, new/zero/unavailable comparisons, uncategorized and unknown IDs, search reset, all three sorts, category-to-history synchronization, and clear-selection behavior. Check that row totals sum to active-mode spending and list count/total match the selected row. Changing month or data source must never retain stale purchases; mode/range choices should still persist as designed.

## Completion

Run the current package scripts for typechecking, relevant tests, lint on changed code, and the production build. For visible changes, check desktop and narrow mobile widths in both themes, keyboard operation, loading, empty, error, and rapid month changes. Verify amounts reconcile across this step’s views and retain the primary-currency basis. Report any checks that could not run.

Finish with the implemented behavior, changed files, validation results, and any remaining limitations. Provide a focused suggested commit title and PR description for this step. Stop here; do not begin the next step.
