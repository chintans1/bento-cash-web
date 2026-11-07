# Step 02: Monthly spending summary and spending-type controls

Copy the prompt below into a Codex task in the target checkout.

---

## Working agreement

Implement only this numbered step on a new `codex/` branch based on the current main (including the prerequisite steps already merged). Inspect the current repository and `AGENTS.md` first. Keep the existing Overview layout and unrelated functionality unless this step explicitly changes it. Do not merge, push, deploy, or implement later steps.

The local prototype is reference material at `/Users/chintan/.codex/worktrees/3789/bento-cash-web`, especially `components/dashboard/spending-dashboard.tsx`, `lib/lunchmoney/spending-insights.ts`, and `hooks/use-spending-history.ts`. It contains uncommitted application changes. Read those files directly if available; do not switch or modify that worktree, cherry-pick its application changes, or copy the monolithic dashboard wholesale. If unavailable, implement from the requirements here. Adapt to current main’s authentication, data scope, routing, cache, design tokens, and runtime; the prototype’s old `useToken` and Next.js setup are not migration targets.

Use `pnpm` and `pnpm exec` exclusively. Follow the repository’s port-3000/server-reuse rule. Keep changes in small components and pure selectors. Use existing dependencies. Preserve all current transaction editing, deletion, imports, and authentication behavior.

## Scope and prerequisites

Requires step 01 merged. Treat the summary and all/flexible/recurring controls as one module because every displayed figure must use the active spending type.

## Implement

- Extract a standalone spending summary component and the smallest shared spending state/data adapter needed by later modules. Reuse current-month data and the existing cached previous-month request; avoid a second uncached fetch. Key results by main’s authenticated data scope plus month. Keep future history/category/day filters extensible without building their UI now.
- Display the selected month’s amount, primary currency, and an explicit “through [date]” or “complete month” label. Show the absolute and percentage change versus the comparable previous period. When previous spend is zero, do not calculate infinity; label new spending or show an unavailable percentage. If both amounts are equal, show unchanged rather than “less.”
- Pair the headline with all/flexible/recurring controls. Add daily average, posted expense count, and no-spend days through the elapsed date. A no-spend day means no spending within the selected mode. Defer the historical monthly average until step 03.
- Make the controls affect this module only; preserve the independent controls and semantics of existing cards. Keep the active spending mode across month navigation. Never relabel old-month figures as the new month while requests are pending. An unavailable comparison must not block current-month figures.
- Place the module in the existing Overview near its spending content. Preserve the current title, net-worth hero, income drill-down, cash flow, categories, merchants, budget, bills, uncategorized alert, and recent transactions. Avoid duplicating the old spend quick-stat: adapt that spending presentation while preserving its existing transaction access and the other quick stats.
- Use existing tokens, accessible pressed states, visible focus, tabular numerals, and touch targets of at least 40px. Explain the linked-recurring definition in a short tooltip or supporting note. Do not rename Overview or reorder the whole page.

## Acceptance evidence

Verify the three modes are disjoint/reconcilable: all = flexible + recurring. Headline, expense count, daily average, and no-spend days must agree with the included transactions. Cover zero spending, a closed month, the current partial month, previous-month failure, rapid navigation, data-source switching, and mode persistence. No historical window should be fetched yet.

## Completion

Run the current package scripts for typechecking, relevant tests, lint on changed code, and the production build. For visible changes, check desktop and narrow mobile widths in both themes, keyboard operation, loading, empty, error, and rapid month changes. Verify amounts reconcile across this step’s views and retain the primary-currency basis. Report any checks that could not run.

Finish with the implemented behavior, changed files, validation results, and any remaining limitations. Provide a focused suggested commit title and PR description for this step. Stop here; do not begin the next step.
